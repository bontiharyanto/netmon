import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  commentRemoteTicket,
  createRemoteTicket,
  parseInboundPayload,
} from "@/lib/ticket-remote";

export function newInboundToken() {
  return `nm_${randomBytes(24).toString("hex")}`;
}

function canOutbound(direction: string) {
  return direction === "both" || direction === "outbound";
}

function canInbound(direction: string) {
  return direction === "both" || direction === "inbound";
}

function matchesSeverity(severities: string, severity: string) {
  return severities.split(",").map((s) => s.trim()).includes(severity);
}

export async function openTicketFromAlert(opts: {
  tenantId: string;
  alertId: string;
  connectorId: string;
  author: string;
}) {
  const [alert, connector] = await Promise.all([
    prisma.alert.findFirst({
      where: { id: opts.alertId, tenant_id: opts.tenantId },
      include: { device: true },
    }),
    prisma.ticket_connector.findFirst({
      where: { id: opts.connectorId, tenant_id: opts.tenantId },
    }),
  ]);
  if (!alert) throw new Error("Alert not found");
  if (!connector?.enabled) throw new Error("Connector is disabled");
  if (!canOutbound(connector.direction)) throw new Error("Connector does not allow opening tickets");

  const existing = await prisma.ticket.findFirst({
    where: { tenant_id: opts.tenantId, alert_id: alert.id, connector_id: connector.id },
  });
  if (existing) return existing;

  const title = `${alert.severity.toUpperCase()} ${alert.event} · ${alert.device.hostname}`;
  const body = [
    `NETMON alert ${alert.id}`,
    `Device: ${alert.device.hostname} (${alert.device.ip})`,
    `Event: ${alert.event}`,
    `Severity: ${alert.severity}`,
    `Status: ${alert.status}`,
    `Opened by: ${opts.author}`,
  ].join("\n");

  const ticket = await prisma.ticket.create({
    data: {
      tenant_id: opts.tenantId,
      connector_id: connector.id,
      alert_id: alert.id,
      device_id: alert.device_id,
      title,
      body,
      status: "open",
      priority: alert.severity === "critical" ? "critical" : "high",
      direction: "outbound",
    },
  });

  try {
    const remote = await createRemoteTicket(connector, {
      title,
      body,
      priority: ticket.priority,
    });
    return prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        external_id: remote.external_id,
        external_url: remote.external_url,
        last_synced_at: new Date(),
        last_error: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "remote create failed";
    return prisma.ticket.update({
      where: { id: ticket.id },
      data: { last_error: message },
    });
  }
}

export async function maybeOpenTicketsForAlert(alertId: string) {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) return;
  const connectors = await prisma.ticket_connector.findMany({
    where: { tenant_id: alert.tenant_id, enabled: true, auto_open: true },
  });
  for (const connector of connectors) {
    if (!canOutbound(connector.direction)) continue;
    if (!matchesSeverity(connector.severities, alert.severity)) continue;
    try {
      await openTicketFromAlert({
        tenantId: alert.tenant_id,
        alertId: alert.id,
        connectorId: connector.id,
        author: "netmon-poller",
      });
    } catch {
      // keep polling even if ITSM is down
    }
  }
}

export async function maybeCommentResolvedAlert(deviceId: string, event: string) {
  const alerts = await prisma.alert.findMany({
    where: { device_id: deviceId, event, status: "resolved" },
    include: { tickets: { include: { connector: true } } },
    orderBy: { resolved_at: "desc" },
    take: 3,
  });
  for (const alert of alerts) {
    for (const ticket of alert.tickets) {
      if (ticket.status === "resolved") continue;
      if (!ticket.connector.enabled || !canOutbound(ticket.connector.direction)) continue;
      await addTicketComment({
        tenantId: alert.tenant_id,
        ticketId: ticket.id,
        author: "netmon-poller",
        body: `Alert recovered on the device. NETMON marked ${event} as resolved.`,
        close: true,
      });
    }
  }
}

export async function addTicketComment(opts: {
  tenantId: string;
  ticketId: string;
  author: string;
  body: string;
  close?: boolean;
  direction?: "inbound" | "outbound";
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: opts.ticketId, tenant_id: opts.tenantId },
    include: { connector: true },
  });
  if (!ticket) throw new Error("Ticket not found");

  const comment = await prisma.ticket_comment.create({
    data: {
      tenant_id: opts.tenantId,
      ticket_id: ticket.id,
      author: opts.author,
      body: opts.body,
      direction: opts.direction ?? "outbound",
    },
  });

  const nextStatus = opts.close ? "resolved" : ticket.status;
  if (opts.direction !== "inbound" && ticket.connector.enabled && canOutbound(ticket.connector.direction)) {
    try {
      await commentRemoteTicket(ticket.connector, ticket.external_id, opts.body);
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: nextStatus, last_synced_at: new Date(), last_error: null },
      });
    } catch (error) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          last_error: error instanceof Error ? error.message : "comment sync failed",
        },
      });
    }
  } else if (nextStatus !== ticket.status) {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: nextStatus } });
  }

  return comment;
}

export async function ingestInboundTicket(token: string, payload: unknown) {
  const connector = await prisma.ticket_connector.findUnique({ where: { inbound_token: token } });
  if (!connector?.enabled) throw new Error("Unknown or disabled connector");
  if (!canInbound(connector.direction)) throw new Error("Connector does not accept inbound tickets");

  const parsed = parseInboundPayload(payload);
  if (!parsed.external_id && !parsed.title) throw new Error("Invalid ticket payload");

  let ticket = parsed.external_id
    ? await prisma.ticket.findFirst({
        where: { connector_id: connector.id, external_id: parsed.external_id },
      })
    : null;

  if (!ticket) {
    ticket = await prisma.ticket.create({
      data: {
        tenant_id: connector.tenant_id,
        connector_id: connector.id,
        external_id: parsed.external_id || `in-${Date.now()}`,
        external_url: parsed.external_url,
        title: parsed.title,
        body: parsed.body,
        status: parsed.status,
        priority: parsed.priority.includes("crit") || parsed.priority.includes("urgent") ? "critical" : "high",
        direction: "inbound",
        last_synced_at: new Date(),
      },
    });
  } else {
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        title: parsed.title || ticket.title,
        body: parsed.body || ticket.body,
        status: parsed.status || ticket.status,
        external_url: parsed.external_url || ticket.external_url,
        last_synced_at: new Date(),
      },
    });
  }

  if (parsed.comment) {
    await prisma.ticket_comment.create({
      data: {
        tenant_id: connector.tenant_id,
        ticket_id: ticket.id,
        author: parsed.author,
        body: parsed.comment,
        direction: "inbound",
      },
    });
  }

  if (ticket.alert_id && parsed.event === "resolved") {
    await prisma.alert.updateMany({
      where: { id: ticket.alert_id, tenant_id: connector.tenant_id, status: "firing" },
      data: { status: "resolved", resolved_at: new Date() },
    });
  }

  return ticket;
}
