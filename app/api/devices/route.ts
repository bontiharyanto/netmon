import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { normalizeCityInput, resolveDeviceCity } from "@/lib/geo/indonesia-cities";

const schema = z.object({
  hostname: z.string().min(1),
  ip: z.string().min(3),
  type: z.string().min(1),
  location: z.string().optional(),
  city: z.string().max(80).optional(),
});

export async function GET() {
  const gate = await requirePermission("assets.read");
  if (gate.error || !gate.session) return gate.error;

  const devices = await prisma.device.findMany({
    where: { tenant_id: gate.session.user.tenantId },
    orderBy: { hostname: "asc" },
  });
  return NextResponse.json(devices);
}

export async function POST(req: Request) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: gate.session.user.tenantId } });
  const count = await prisma.device.count({ where: { tenant_id: gate.session.user.tenantId } });
  if (tenant && count >= tenant.device_limit) {
    return NextResponse.json({ error: "Device limit tercapai" }, { status: 409 });
  }

  const city =
    normalizeCityInput(parsed.data.city) ??
    resolveDeviceCity({ city: parsed.data.city, location: parsed.data.location })?.slug ??
    null;

  const device = await prisma.device.create({
    data: {
      hostname: parsed.data.hostname,
      ip: parsed.data.ip,
      type: parsed.data.type,
      location: parsed.data.location || null,
      city,
      tenant_id: gate.session.user.tenantId,
    },
  });
  await prisma.sla.create({ data: { device_id: device.id, uptime_30d: 100 } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `device.create:${device.hostname}`);
  return NextResponse.json(device);
}
