import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IDLE_COOKIE, parseIdleMinutes, sessionMaxHours, sessionMaxSeconds } from "@/lib/idle";
import { buildIdleCookie } from "@/lib/idle-cookie";

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { idle_minutes: true },
  });
  const idleMinutes = parseIdleMinutes(tenant?.idle_minutes);
  const now = Date.now();
  const cookie = buildIdleCookie(now, idleMinutes);
  const res = NextResponse.json({
    ok: true,
    idle_minutes: idleMinutes,
    last_active_at: new Date(now).toISOString(),
    session_max_hours: sessionMaxHours(),
  });
  res.cookies.set(IDLE_COOKIE, cookie.value, cookie.options);
  return res;
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { idle_minutes: true },
  });
  return NextResponse.json({
    idle_minutes: parseIdleMinutes(tenant?.idle_minutes),
    session_max_hours: sessionMaxHours(),
    session_max_seconds: sessionMaxSeconds(),
  });
}
