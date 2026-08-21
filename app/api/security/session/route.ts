import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { parseIdleMinutes } from "@/lib/idle";

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;
  const tenant = await prisma.tenant.findUnique({
    where: { id: gate.session.user.tenantId },
    select: { idle_minutes: true },
  });
  return NextResponse.json({ idle_minutes: parseIdleMinutes(tenant?.idle_minutes) });
}

export async function PATCH(req: Request) {
  try {
    const gate = await requirePermission("security.manage");
    if (gate.error || !gate.session) return gate.error;
    const body = await req.json().catch(() => ({}));
    const idle_minutes = parseIdleMinutes(body.idle_minutes);
    await prisma.tenant.update({
      where: { id: gate.session.user.tenantId },
      data: { idle_minutes },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `session.idle:${idle_minutes}`);
    return NextResponse.json({ idle_minutes });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
