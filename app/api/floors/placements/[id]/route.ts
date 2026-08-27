import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { clampPercent } from "@/lib/floors";

const schema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.floor_placement.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    include: { device: { select: { hostname: true } }, floor: { select: { name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const placement = await prisma.floor_placement.update({
    where: { id: existing.id },
    data: {
      x: parsed.data.x === undefined ? undefined : clampPercent(parsed.data.x),
      y: parsed.data.y === undefined ? undefined : clampPercent(parsed.data.y),
    },
    include: {
      device: { select: { id: true, hostname: true, ip: true, type: true, status: true } },
    },
  });
  await writeAudit(
    gate.session.user.tenantId,
    gate.session.user.id,
    `floor.move:${existing.floor.name}:${existing.device.hostname}`,
  );
  return NextResponse.json(placement);
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.floor_placement.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    include: { device: { select: { hostname: true } }, floor: { select: { name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.floor_placement.delete({ where: { id: existing.id } });
  await writeAudit(
    gate.session.user.tenantId,
    gate.session.user.id,
    `floor.unplace:${existing.floor.name}:${existing.device.hostname}`,
  );
  return NextResponse.json({ ok: true });
}
