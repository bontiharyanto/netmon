import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { parseIdleMinutes, sessionMaxHours } from "@/lib/idle";
import { parsePasswordDays } from "@/lib/password-policy";

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;
  const tenant = await prisma.tenant.findUnique({
    where: { id: gate.session.user.tenantId },
    select: { idle_minutes: true, password_days: true },
  });
  return NextResponse.json({
    idle_minutes: parseIdleMinutes(tenant?.idle_minutes),
    password_days: parsePasswordDays(tenant?.password_days),
    session_max_hours: sessionMaxHours(),
  });
}

export async function PATCH(req: Request) {
  try {
    const gate = await requirePermission("security.manage");
    if (gate.error || !gate.session) return gate.error;
    const body = await req.json().catch(() => ({}));
    const data: { idle_minutes?: number; password_days?: number } = {};
    if (body.idle_minutes !== undefined) data.idle_minutes = parseIdleMinutes(body.idle_minutes);
    if (body.password_days !== undefined) data.password_days = parsePasswordDays(body.password_days);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const tenant = await prisma.tenant.update({
      where: { id: gate.session.user.tenantId },
      data,
      select: { idle_minutes: true, password_days: true },
    });
    const audit = [
      data.idle_minutes !== undefined ? `session.idle:${data.idle_minutes}` : null,
      data.password_days !== undefined ? `password.days:${data.password_days}` : null,
    ]
      .filter(Boolean)
      .join(",");
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, audit);
    return NextResponse.json({
      idle_minutes: parseIdleMinutes(tenant.idle_minutes),
      password_days: parsePasswordDays(tenant.password_days),
      session_max_hours: sessionMaxHours(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
