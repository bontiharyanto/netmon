import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2),
  ci_type: z.string().min(2),
  asset_tag: z.string().optional(),
  serial: z.string().optional(),
  owner: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["in_service", "maintenance", "retired", "outage"]).optional(),
  device_id: z.string().optional(),
});

function blank(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  const gate = await requirePermission("cmdb.read");
  if (gate.error || !gate.session) return gate.error;

  const items = await prisma.cmdb_ci.findMany({
    where: { tenant_id: gate.session.user.tenantId },
    include: { device: { select: { hostname: true, ip: true, status: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const gate = await requirePermission("cmdb.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const deviceId = blank(parsed.data.device_id);
  if (deviceId) {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, tenant_id: gate.session.user.tenantId },
      select: { id: true },
    });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 400 });
  }

  const item = await prisma.cmdb_ci.create({
    data: {
      tenant_id: gate.session.user.tenantId,
      name: parsed.data.name.trim(),
      ci_type: parsed.data.ci_type.trim(),
      asset_tag: blank(parsed.data.asset_tag),
      serial: blank(parsed.data.serial),
      owner: blank(parsed.data.owner),
      location: blank(parsed.data.location),
      status: parsed.data.status ?? "in_service",
      device_id: deviceId,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `cmdb.create:${item.name}`);
  return NextResponse.json(item);
}
