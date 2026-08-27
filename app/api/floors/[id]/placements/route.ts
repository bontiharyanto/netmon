import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { clampPercent } from "@/lib/floors";

const schema = z.object({
  device_id: z.string().min(1),
  x: z.number(),
  y: z.number(),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const floor = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

  const device = await prisma.device.findFirst({
    where: { id: parsed.data.device_id, tenant_id: gate.session.user.tenantId },
  });
  if (!device) return NextResponse.json({ error: "Device not found" }, { status: 400 });

  const x = clampPercent(parsed.data.x);
  const y = clampPercent(parsed.data.y);

  const placement = await prisma.floor_placement.upsert({
    where: { floor_id_device_id: { floor_id: floor.id, device_id: device.id } },
    create: {
      tenant_id: gate.session.user.tenantId,
      floor_id: floor.id,
      device_id: device.id,
      x,
      y,
    },
    update: { x, y },
    include: {
      device: { select: { id: true, hostname: true, ip: true, type: true, status: true } },
    },
  });

  await writeAudit(
    gate.session.user.tenantId,
    gate.session.user.id,
    `floor.place:${floor.name}:${device.hostname}`,
  );
  return NextResponse.json(placement);
}
