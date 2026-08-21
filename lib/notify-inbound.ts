import { prisma } from "@/lib/prisma";
import { addTicketComment } from "@/lib/tickets";
import { pushNotification } from "@/lib/notifications";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseInboundEmail(payload: unknown) {
  const raw = asRecord(payload);
  const from = String(raw.from ?? raw.sender ?? raw.From ?? "");
  const subject = String(raw.subject ?? raw.Subject ?? "");
  const text = String(raw.text ?? raw["body-plain"] ?? raw["stripped-text"] ?? raw.body ?? raw.TextBody ?? "");
  const match = subject.match(/\[NETMON\s+([a-z0-9_]+)\]/i);
  return { from, subject, text: text.trim(), token: match?.[1] ?? "" };
}

export async function ingestEmailReply(payload: unknown) {
  const parsed = parseInboundEmail(payload);
  if (!parsed.text) throw new Error("Empty email body");

  let tenantId: string | null = null;
  let ticketId: string | null = null;
  let kind: "ticket" | "alert" | "reply" = "reply";

  if (parsed.token.startsWith("tkt_")) {
    const ticket = await prisma.ticket.findUnique({ where: { id: parsed.token.slice(4) } });
    if (ticket) {
      tenantId = ticket.tenant_id;
      ticketId = ticket.id;
      kind = "ticket";
      await addTicketComment({
        tenantId: ticket.tenant_id,
        ticketId: ticket.id,
        author: parsed.from || "email",
        body: parsed.text,
        direction: "inbound",
      });
    }
  }

  if (!tenantId && parsed.token.startsWith("alt_")) {
    const alert = await prisma.alert.findUnique({
      where: { id: parsed.token.slice(4) },
      include: { tickets: true },
    });
    if (alert) {
      tenantId = alert.tenant_id;
      kind = "alert";
      const linked = alert.tickets[0];
      if (linked) {
        ticketId = linked.id;
        await addTicketComment({
          tenantId: alert.tenant_id,
          ticketId: linked.id,
          author: parsed.from || "email",
          body: parsed.text,
          direction: "inbound",
        });
      }
    }
  }

  if (!tenantId) {
    const recent = await prisma.notification.findFirst({
      orderBy: { created_at: "desc" },
      where: parsed.token ? { ref_id: { contains: parsed.token.replace(/^(alt_|tkt_)/, "") } } : undefined,
    });
    tenantId = recent?.tenant_id ?? null;
  }

  if (!tenantId) throw new Error("Could not match email to a NETMON alert or ticket");

  await pushNotification({
    tenantId,
    title: `Email reply from ${parsed.from || "unknown"}`,
    body: parsed.text.slice(0, 280),
    kind,
    refId: ticketId,
    severity: "info",
  });

  return { ok: true, tenantId, ticketId };
}
