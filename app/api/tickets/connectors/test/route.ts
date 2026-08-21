import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { testTicketConnector } from "@/lib/ticket-remote";

export async function POST(req: Request) {
  try {
    const gate = await requirePermission("channels.manage");
    if (gate.error || !gate.session) return gate.error;
    const { id } = await req.json();
    const row = await prisma.ticket_connector.findFirst({
      where: { id, tenant_id: gate.session.user.tenantId },
    });
    if (!row) return NextResponse.json({ error: "Save the connector first" }, { status: 400 });
    const result = await testTicketConnector(row);
    await prisma.ticket_connector.update({
      where: { id: row.id },
      data: { last_tested_at: new Date(), last_status: result.status },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `ticket.connector.test:${row.provider}`);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    return NextResponse.json({ ok: false, status: message }, { status: 500 });
  }
}
