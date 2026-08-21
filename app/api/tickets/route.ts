import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { openTicketFromAlert } from "@/lib/tickets";
import { pushNotification } from "@/lib/notifications";

const schema = z.object({
  alert_id: z.string(),
  connector_id: z.string(),
});

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;
  const [tickets, connectors] = await Promise.all([
    prisma.ticket.findMany({
      where: { tenant_id: gate.session.user.tenantId },
      include: {
        connector: { select: { name: true, provider: true } },
        alert: { select: { id: true, event: true, status: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 200,
    }),
    prisma.ticket_connector.findMany({
      where: {
        tenant_id: gate.session.user.tenantId,
        enabled: true,
        direction: { in: ["both", "outbound"] },
      },
      select: { id: true, name: true, provider: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return NextResponse.json({ tickets, connectors });
}

export async function POST(req: Request) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  try {
    const ticket = await openTicketFromAlert({
      tenantId: gate.session.user.tenantId,
      alertId: parsed.data.alert_id,
      connectorId: parsed.data.connector_id,
      author: gate.session.user.email ?? "operator",
    });
    await writeAudit(
      gate.session.user.tenantId,
      gate.session.user.id,
      `ticket.open:${ticket.id}`,
    );
    await pushNotification({
      tenantId: gate.session.user.tenantId,
      title: `Ticket opened · ${ticket.external_id || ticket.id}`,
      body: ticket.title,
      kind: "ticket",
      refId: ticket.id,
      severity: ticket.priority,
    });
    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
