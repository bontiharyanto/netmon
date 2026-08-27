import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  address: z.string().max(240).nullable().optional(),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.building.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const building = await prisma.building.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim() ?? undefined,
      address: parsed.data.address === undefined ? undefined : parsed.data.address?.trim() || null,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `building.update:${building.name}`);
  return NextResponse.json(building);
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.building.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.building.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `building.delete:${existing.name}`);
  return NextResponse.json({ ok: true });
}
