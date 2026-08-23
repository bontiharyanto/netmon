import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, isMasked } from "@/lib/crypto";
import { cfg, getTicketProvider } from "@/lib/ticket-providers";
import { novaCrmAlertBody, novaCrmContext, novaCrmHeaders, parseNovaCrmTicket } from "@/lib/ticket-novacrm";

type Connector = {
  id: string;
  tenant_id: string;
  provider: string;
  base_url: string;
  api_user: string;
  api_key: string | null;
  config: unknown;
};

type RemoteTicket = { external_id: string; external_url?: string | null };

function origin(url: string) {
  return url.replace(/\/$/, "");
}

function basic(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function keyOf(connector: Connector) {
  return connector.api_key ? decryptSecret(connector.api_key) : "";
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 400) };
    }
    return { res, json };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ticketing endpoint timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function testTicketConnector(connector: Connector) {
  if (connector.provider === "netmon") {
    return { ok: true, status: "NETMON Helpdesk ready (local auto-tickets)" };
  }

  const secret = keyOf(connector);

  try {
    if (connector.provider === "novacrm") {
      const nova = novaCrmContext(connector);
      const { res, json } = await fetchJson(nova.health, {
        headers: novaCrmHeaders(secret, nova.slug),
      });
      const row = asRecord(asRecord(json).data);
      if (!res.ok) {
        return {
          ok: false,
          status: res.status === 404 ? "NovaCRM tenant not found — check the slug" : `NovaCRM ${res.status}`,
        };
      }
      if (row.status === "blocked") return { ok: false, status: "NovaCRM tenant is paused" };
      const cmdb = await fetchJson(nova.cmdb, {
        method: "POST",
        headers: novaCrmHeaders(secret, nova.slug),
        body: JSON.stringify({ source: "NETMON", op: "ping" }),
      });
      if (cmdb.res.ok) {
        return {
          ok: true,
          status: nova.slug ? `NovaCRM tenant ${nova.slug} reachable · CMDB sync ready` : "NovaCRM reachable · CMDB sync ready",
        };
      }
      if (cmdb.res.status === 404) {
        return {
          ok: true,
          status: nova.slug
            ? `NovaCRM tenant ${nova.slug} reachable · CMDB channel not deployed yet`
            : "NovaCRM reachable · CMDB channel not deployed yet",
        };
      }
      return {
        ok: true,
        status: nova.slug ? `NovaCRM tenant ${nova.slug} reachable` : "NovaCRM reachable",
      };
    }

    const base = origin(connector.base_url);
    if (!base) return { ok: false, status: "missing base URL" };

    if (connector.provider === "jira") {
      const { res } = await fetchJson(`${base}/rest/api/2/myself`, {
        headers: { Authorization: basic(connector.api_user, secret) },
      });
      return { ok: res.ok, status: res.ok ? "Jira authenticated" : `Jira ${res.status}` };
    }
    if (connector.provider === "servicenow") {
      const table = cfg(connector.config, "table", "incident");
      const { res } = await fetchJson(`${base}/api/now/table/${table}?sysparm_limit=1`, {
        headers: { Authorization: basic(connector.api_user, secret), Accept: "application/json" },
      });
      return { ok: res.ok, status: res.ok ? "ServiceNow authenticated" : `ServiceNow ${res.status}` };
    }
    if (connector.provider === "zendesk") {
      const { res } = await fetchJson(`${base}/api/v2/users/me.json`, {
        headers: { Authorization: basic(`${connector.api_user}/token`, secret) },
      });
      return { ok: res.ok, status: res.ok ? "Zendesk authenticated" : `Zendesk ${res.status}` };
    }
    if (connector.provider === "freshdesk") {
      const { res } = await fetchJson(`${base}/api/v2/tickets?per_page=1`, {
        headers: { Authorization: basic(secret, "X") },
      });
      return { ok: res.ok, status: res.ok ? "Freshdesk authenticated" : `Freshdesk ${res.status}` };
    }
    if (connector.provider === "glpi") {
      const { res } = await fetchJson(`${base}/initSession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "App-Token": secret,
          Authorization: connector.api_user ? `user_token ${connector.api_user}` : "",
        },
      });
      return { ok: res.ok, status: res.ok ? "GLPI session ok" : `GLPI ${res.status}` };
    }
    if (connector.provider === "custom" || connector.provider === "osticket") {
      return { ok: true, status: "endpoint configured — send a test ticket to verify" };
    }
    return { ok: false, status: "unknown provider" };
  } catch (error) {
    return { ok: false, status: error instanceof Error ? error.message : "unreachable" };
  }
}

export async function createRemoteTicket(
  connector: Connector,
  payload: { title: string; body: string; priority: string; fingerprint?: string; instance?: string },
): Promise<RemoteTicket> {
  const secret = keyOf(connector);

  if (connector.provider === "novacrm") {
    if (!secret) throw new Error("NovaCRM webhook secret is required");
    const nova = novaCrmContext(connector);
    const { res, json } = await fetchJson(nova.alerts, {
      method: "POST",
      headers: novaCrmHeaders(secret, nova.slug),
      body: JSON.stringify(novaCrmAlertBody(payload)),
    });
    const created = parseNovaCrmTicket(json);
    if (!res.ok || !created.external_id) {
      const err = String(asRecord(json).error ?? `NovaCRM ${res.status}`);
      throw new Error(err);
    }
    return {
      external_id: created.external_id,
      external_url: created.ticketId ? nova.ticketUrl(created.ticketId) : `${nova.host}/tickets`,
    };
  }

  const base = origin(connector.base_url);
  if (!base) throw new Error("missing base URL");

  if (connector.provider === "jira") {
    const { res, json } = await fetchJson(`${base}/rest/api/2/issue`, {
      method: "POST",
      headers: { Authorization: basic(connector.api_user, secret), "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          project: { key: cfg(connector.config, "project_key", "NOC") },
          summary: payload.title,
          description: payload.body,
          issuetype: { name: cfg(connector.config, "issue_type", "Incident") },
          labels: ["netmon"],
        },
      }),
    });
    const data = asRecord(json);
    if (!res.ok || !data.key) throw new Error(`Jira ${res.status}`);
    return { external_id: String(data.key), external_url: `${base}/browse/${data.key}` };
  }

  if (connector.provider === "servicenow") {
    const table = cfg(connector.config, "table", "incident");
    const { res, json } = await fetchJson(`${base}/api/now/table/${table}`, {
      method: "POST",
      headers: {
        Authorization: basic(connector.api_user, secret),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        short_description: payload.title,
        description: payload.body,
        urgency: payload.priority === "critical" ? "1" : "2",
      }),
    });
    const result = asRecord(asRecord(json).result);
    if (!res.ok || !result.sys_id) throw new Error(`ServiceNow ${res.status}`);
    return {
      external_id: String(result.number || result.sys_id),
      external_url: `${base}/nav_to.do?uri=${table}.do?sys_id=${result.sys_id}`,
    };
  }

  if (connector.provider === "zendesk") {
    const { res, json } = await fetchJson(`${base}/api/v2/tickets.json`, {
      method: "POST",
      headers: { Authorization: basic(`${connector.api_user}/token`, secret), "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket: {
          subject: payload.title,
          comment: { body: payload.body },
          priority: payload.priority === "critical" ? "urgent" : "high",
          tags: ["netmon"],
        },
      }),
    });
    const ticket = asRecord(asRecord(json).ticket);
    if (!res.ok || ticket.id == null) throw new Error(`Zendesk ${res.status}`);
    return { external_id: String(ticket.id), external_url: `${base}/agent/tickets/${ticket.id}` };
  }

  if (connector.provider === "freshdesk") {
    const { res, json } = await fetchJson(`${base}/api/v2/tickets`, {
      method: "POST",
      headers: { Authorization: basic(secret, "X"), "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: payload.title,
        description: payload.body.replace(/\n/g, "<br>"),
        email: cfg(connector.config, "requester_email", connector.api_user || "noc@netmon.click"),
        priority: payload.priority === "critical" ? 4 : 3,
        status: 2,
      }),
    });
    const data = asRecord(json);
    if (!res.ok || data.id == null) throw new Error(`Freshdesk ${res.status}`);
    return { external_id: String(data.id), external_url: `${base}/a/tickets/${data.id}` };
  }

  if (connector.provider === "glpi") {
    const session = await fetchJson(`${base}/initSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Token": secret,
        Authorization: connector.api_user ? `user_token ${connector.api_user}` : "",
      },
    });
    const token = String(asRecord(session.json).session_token ?? "");
    if (!session.res.ok || !token) throw new Error(`GLPI session ${session.res.status}`);
    const created = await fetchJson(`${base}/Ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "App-Token": secret, "Session-Token": token },
      body: JSON.stringify({ input: { name: payload.title, content: payload.body } }),
    });
    const id = asRecord(created.json).id;
    if (!created.res.ok || id == null) throw new Error(`GLPI ${created.res.status}`);
    return { external_id: String(id), external_url: `${origin(base.replace(/\/apirest\.php$/, ""))}/front/ticket.form.php?id=${id}` };
  }

  if (connector.provider === "osticket") {
    const { res, json } = await fetchJson(`${base}/api/tickets.json`, {
      method: "POST",
      headers: { "X-API-Key": secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        alert: true,
        source: "API",
        name: "NETMON",
        email: connector.api_user || "noreply@netmon.click",
        subject: payload.title,
        message: payload.body,
        topicId: cfg(connector.config, "topic_id", "1"),
      }),
    });
    const id = typeof json === "string" || typeof json === "number" ? String(json) : String(asRecord(json).id ?? "");
    if (!res.ok) throw new Error(`osTicket ${res.status}`);
    return { external_id: id || `osticket-${Date.now()}`, external_url: null };
  }

  const headerName = cfg(connector.config, "auth_header", "Authorization");
  const { res, json } = await fetchJson(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [headerName]: secret ? `Bearer ${secret}` : "",
    },
    body: JSON.stringify({ source: "NETMON", event: "ticket.create", ...payload }),
  });
  const data = asRecord(json);
  if (!res.ok) throw new Error(`remote ${res.status}`);
  return {
    external_id: String(data.id ?? data.key ?? data.external_id ?? `custom-${Date.now()}`),
    external_url: data.url ? String(data.url) : null,
  };
}

export async function commentRemoteTicket(
  connector: Connector,
  externalId: string,
  body: string,
  extra?: { fingerprint?: string; close?: boolean },
) {
  if (!externalId && !extra?.fingerprint) return;
  const secret = keyOf(connector);

  if (connector.provider === "novacrm") {
    if (!secret) return;
    const nova = novaCrmContext(connector);
    await fetchJson(nova.alerts, {
      method: "POST",
      headers: novaCrmHeaders(secret, nova.slug),
      body: JSON.stringify(
        novaCrmAlertBody({
          title: extra?.close ? "NETMON alert recovered" : "NETMON update",
          body,
          priority: extra?.close ? "info" : "high",
          fingerprint: extra?.fingerprint || externalId,
          resolved: extra?.close,
        }),
      ),
    });
    return;
  }

  if (!externalId) return;
  const base = origin(connector.base_url);

  if (connector.provider === "jira") {
    await fetchJson(`${base}/rest/api/2/issue/${externalId}/comment`, {
      method: "POST",
      headers: { Authorization: basic(connector.api_user, secret), "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    return;
  }
  if (connector.provider === "servicenow") {
    const table = cfg(connector.config, "table", "incident");
    await fetchJson(`${base}/api/now/table/${table}/${externalId}`, {
      method: "PATCH",
      headers: { Authorization: basic(connector.api_user, secret), "Content-Type": "application/json" },
      body: JSON.stringify({ work_notes: body }),
    });
    return;
  }
  if (connector.provider === "zendesk") {
    await fetchJson(`${base}/api/v2/tickets/${externalId}.json`, {
      method: "PUT",
      headers: { Authorization: basic(`${connector.api_user}/token`, secret), "Content-Type": "application/json" },
      body: JSON.stringify({ ticket: { comment: { body, public: true } } }),
    });
    return;
  }
  if (connector.provider === "freshdesk") {
    await fetchJson(`${base}/api/v2/tickets/${externalId}/notes`, {
      method: "POST",
      headers: { Authorization: basic(secret, "X"), "Content-Type": "application/json" },
      body: JSON.stringify({ body, private: false }),
    });
  }
}

export function parseInboundPayload(body: unknown) {
  const raw = asRecord(body);
  const issue = asRecord(raw.issue);
  const issueFields = asRecord(issue.fields);
  const zd = asRecord(raw.ticket);
  const sn = asRecord(raw.result ?? raw.incident);
  const novaData = Array.isArray(raw.data) ? asRecord(raw.data[0]) : asRecord(raw.data);

  const event = String(raw.event ?? raw.webhookEvent ?? raw.type ?? "updated").toLowerCase();
  const title = String(
    raw.title ??
      raw.subject ??
      raw.short_description ??
      issueFields.summary ??
      zd.subject ??
      sn.short_description ??
      novaData.title ??
      "Inbound ticket",
  );
  const text = String(
    raw.body ?? raw.description ?? raw.comment ?? issueFields.description ?? zd.description ?? sn.description ?? novaData.message ?? "",
  );
  const external_id = String(
    raw.external_id ??
      raw.key ??
      issue.key ??
      zd.id ??
      sn.number ??
      sn.sys_id ??
      novaData.number ??
      novaData.ticketId ??
      raw.id ??
      "",
  );
  const statusRaw = String(
    raw.status ?? asRecord(issueFields.status).name ?? zd.status ?? sn.state ?? "open",
  ).toLowerCase();
  const resolved = event.includes("resolv") || event.includes("close") || ["resolved", "closed", "done"].includes(statusRaw);
  const commented = event.includes("comment");

  return {
    event: resolved ? "resolved" : commented ? "commented" : event.includes("creat") ? "created" : "updated",
    external_id,
    external_url: raw.url ? String(raw.url) : issue.self ? String(issue.self) : zd.url ? String(zd.url) : null,
    title,
    body: text,
    status: resolved ? "resolved" : statusRaw || "open",
    priority: String(raw.priority ?? asRecord(issueFields.priority).name ?? zd.priority ?? "high").toLowerCase(),
    comment: raw.comment
      ? String(asRecord(raw.comment).body ?? raw.comment)
      : commented
        ? text
        : "",
    author: String(raw.author ?? raw.requester ?? asRecord(raw.user).name ?? "ticketing"),
  };
}

export function mergeConnectorKey(existing: string | null, incoming?: string | null) {
  if (incoming == null || incoming === "" || isMasked(incoming)) return existing;
  return encryptSecret(incoming);
}

export function publicConnector(
  row: {
    id: string;
    provider: string;
    name: string;
    enabled: boolean;
    direction: string;
    auto_open: boolean;
    severities: string;
    base_url: string;
    api_user: string;
    api_key: string | null;
    config: unknown;
    inbound_token: string;
    last_tested_at: Date | null;
    last_status: string | null;
  },
  webhookUrl: string,
) {
  const provider = getTicketProvider(row.provider);
  return {
    id: row.id,
    provider: row.provider,
    provider_name: provider?.name ?? row.provider,
    name: row.name,
    enabled: row.enabled,
    direction: row.direction,
    auto_open: row.auto_open,
    severities: row.severities.split(",").filter(Boolean),
    events: cfg(row.config, "events", "*").split(",").map((s) => s.trim()).filter(Boolean),
    base_url: row.base_url,
    api_user: row.api_user,
    api_key: row.api_key ? "••••••••" : "",
    has_key: Boolean(row.api_key),
    config: (row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? row.config
      : {}) as Record<string, string>,
    inbound_token: row.inbound_token,
    inbound_url: webhookUrl,
    last_tested_at: row.last_tested_at?.toISOString() ?? null,
    last_status: row.last_status,
  };
}

export async function getConnector(tenantId: string, id: string) {
  return prisma.ticket_connector.findFirst({ where: { id, tenant_id: tenantId } });
}
