import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  level: z.number().int().min(-5).max(200).optional(),
});

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.read");
  if (gate.error || !gate.session) return gate.error;

  const floor = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    include: {
      building: { select: { id: true, name: true, address: true } },
      placements: {
        include: {
          device: {
            select: { id: true, hostname: true, ip: true, type: true, status: true },
          },
        },
        orderBy: { updated_at: "desc" },
      },
    },
  });
  if (!floor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { image_data: _image, image_mime, ...rest } = floor;
  void _image;
  return NextResponse.json({
    ...rest,
    has_image: Boolean(image_mime),
    image_url: image_mime ? `/api/floors/${floor.id}/image` : null,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const floor = await prisma.floor.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim() ?? undefined,
      level: parsed.data.level,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `floor.update:${floor.name}`);
  return NextResponse.json(floor);
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.floor.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.floor.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `floor.delete:${existing.name}`);
  return NextResponse.json({ ok: true });
}
