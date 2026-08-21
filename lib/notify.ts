import { Prisma } from "@prisma/client";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { readSecret } from "@/lib/channel-store";
import { pushNotification } from "@/lib/notifications";

export type AlertMessage = {
  tenantId: string;
  title: string;
  body: string;
  severity: string;
  href?: string;
  token: string;
};

function cfg(row: { config: Prisma.JsonValue }, key: string) {
  return readSecret(row.config, key);
}

function withReply(text: string, replyTo?: string, token?: string) {
  if (!replyTo) return text;
  return `${text}\n\nReply by email: ${replyTo}${token ? `\nSubject must include [NETMON ${token}]` : ""}`;
}

async function sendSmtp(opts: {
  host: string;
  port: number;
  username?: string;
  password?: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
}) {
  if (!opts.host || !opts.to.length) return { ok: false, status: "missing SMTP host or recipients" };
  try {
    const transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.port === 465,
      auth: opts.username ? { user: opts.username, pass: opts.password ?? "" } : undefined,
    });
    await transporter.sendMail({
      from: opts.from,
      to: opts.to.join(", "),
      replyTo: opts.replyTo || opts.from,
      subject: opts.subject,
      text: opts.text,
    });
    return { ok: true, status: "email sent" };
  } catch (error) {
    return { ok: false, status: error instanceof Error ? error.message : "SMTP failed" };
  }
}

export async function emailChannelRow(tenantId: string) {
  return prisma.notify_channel.findUnique({
    where: { tenant_id_type: { tenant_id: tenantId, type: "email" } },
  });
}

export async function sendReplyEmail(tenantId: string, message: AlertMessage, extraReplyTo?: string) {
  const email = await emailChannelRow(tenantId);
  const host = email ? cfg(email, "host") : "";
  const replyTo = extraReplyTo || (email ? cfg(email, "reply_to") : "") || (email ? cfg(email, "from") : "");
  const to = [
    ...(email ? cfg(email, "to").split(/[,;]/).map((s) => s.trim()).filter(Boolean) : []),
    extraReplyTo,
  ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

  if (!host || !to.length) return { ok: false, status: "email channel not ready" };

  return sendSmtp({
    host,
    port: Number(email ? cfg(email, "port") : "587") || 587,
    username: email ? cfg(email, "username") : "",
    password: email ? cfg(email, "password") : "",
    from: (email ? cfg(email, "from") : "") || "noreply@netmon.click",
    to,
    replyTo,
    subject: `[NETMON ${message.token}] ${message.title}`,
    text: withReply(message.body, replyTo, message.token),
  });
}

async function postJson(url: string, payload: unknown, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    return res.ok ? `delivered (${res.status})` : `remote ${res.status}`;
  } finally {
    clearTimeout(timer);
  }
}

export async function deliverChannel(
  type: string,
  row: { config: Prisma.JsonValue },
  message: AlertMessage,
) {
  const replyTo = cfg(row, "reply_to");
  const text = withReply(message.body, replyTo, message.token);

  if (type === "email") {
    const result = await sendReplyEmail(message.tenantId, message, replyTo);
    return result.status;
  }
  if (type === "slack" || type === "teams" || type === "discord") {
    const url = cfg(row, "webhook_url");
    if (!url) return "missing webhook";
    return postJson(url, {
      text,
      content: text,
      channel: cfg(row, "channel") || undefined,
      source: "NETMON",
      reply_to: replyTo || undefined,
    });
  }
  if (type === "webhook") {
    const url = cfg(row, "url");
    if (!url) return "missing url";
    return postJson(url, { source: "NETMON", reply_to: replyTo, ...message, body: text }, cfg(row, "secret") ? { "X-NETMON-Secret": cfg(row, "secret") } : {});
  }
  if (type === "telegram") {
    const token = cfg(row, "bot_token");
    const chat = cfg(row, "chat_id");
    if (!token || !chat) return "missing telegram credentials";
    return postJson(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chat, text });
  }
  if (type === "whatsapp") {
    const url = cfg(row, "api_url");
    const token = cfg(row, "token");
    if (!url || !token) return "missing WhatsApp credentials";
    return postJson(
      url,
      { messaging_product: "whatsapp", to: cfg(row, "to"), type: "text", text: { body: text } },
      { Authorization: `Bearer ${token}` },
    );
  }
  if (type === "sms") {
    const sid = cfg(row, "account_sid");
    const auth = cfg(row, "auth_token");
    const from = cfg(row, "from");
    const to = cfg(row, "to").split(/[,;]/)[0]?.trim();
    if (!sid || !auth || !from || !to) return "missing SMS credentials";
    const params = new URLSearchParams({ From: from, To: to, Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}` },
      body: params,
    });
    return res.ok ? `sms ${res.status}` : `sms ${res.status}`;
  }
  if (type === "pagerduty") {
    const key = cfg(row, "routing_key");
    if (!key) return "missing routing key";
    return postJson("https://events.pagerduty.com/v2/enqueue", {
      routing_key: key,
      event_action: "trigger",
      payload: {
        summary: message.title,
        severity: message.severity === "critical" ? "critical" : "warning",
        source: "NETMON",
        custom_details: { body: text, reply_to: replyTo },
      },
    });
  }
  return "channel queued";
}

export async function dispatchTenantMessage(tenantId: string, message: Omit<AlertMessage, "tenantId">, severity: string) {
  const payload: AlertMessage = { ...message, tenantId };
  const channels = await prisma.notify_channel.findMany({ where: { tenant_id: tenantId, enabled: true } });
  const results: string[] = [];
  const replyAddresses = new Set<string>();

  for (const channel of channels) {
    const allowed = channel.severities.split(",").map((s) => s.trim());
    if (!allowed.includes(severity) && !allowed.includes("info")) continue;
    const replyTo = cfg(channel, "reply_to");
    if (replyTo) replyAddresses.add(replyTo);
    try {
      results.push(`${channel.type}: ${await deliverChannel(channel.type, channel, payload)}`);
    } catch (error) {
      results.push(`${channel.type}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  const emailEnabled = channels.some((c) => c.type === "email" && c.enabled);
  if (!emailEnabled && replyAddresses.size) {
    for (const addr of Array.from(replyAddresses)) {
      try {
        await sendReplyEmail(tenantId, payload, addr);
        results.push(`reply-email: sent to ${addr}`);
      } catch (error) {
        results.push(`reply-email: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
  }

  return results;
}

export async function notifyAlert(opts: {
  tenantId: string;
  alertId: string;
  title: string;
  body: string;
  severity: string;
  recovered?: boolean;
}) {
  await pushNotification({
    tenantId: opts.tenantId,
    title: opts.title,
    body: opts.body,
    kind: "alert",
    refId: opts.alertId,
    severity: opts.severity,
  });
  await dispatchTenantMessage(
    opts.tenantId,
    {
      title: opts.title,
      body: opts.body,
      severity: opts.severity,
      token: `alt_${opts.alertId}`,
    },
    opts.recovered ? "info" : opts.severity,
  );
}
