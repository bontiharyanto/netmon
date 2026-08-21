import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  hostname: z.string().min(1),
  ip: z.string().min(3),
  type: z.string().min(1),
  location: z.string().optional(),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({
    where: { tenant_id: session.user.tenantId },
    orderBy: { hostname: "asc" },
  });
  return NextResponse.json(devices);
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWrite(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
  const count = await prisma.device.count({ where: { tenant_id: session.user.tenantId } });
  if (tenant && count >= tenant.device_limit) {
    return NextResponse.json({ error: "Device limit tercapai" }, { status: 409 });
  }

  const device = await prisma.device.create({
    data: { ...parsed.data, tenant_id: session.user.tenantId },
  });
  await prisma.sla.create({ data: { device_id: device.id, uptime_30d: 100 } });
  await writeAudit(session.user.tenantId, session.user.id, `device.create:${device.hostname}`);
  return NextResponse.json(device);
}
