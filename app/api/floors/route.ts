import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  building_id: z.string().min(1),
  name: z.string().min(1).max(120),
  level: z.number().int().min(-5).max(200).optional(),
});

export async function POST(req: Request) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const building = await prisma.building.findFirst({
    where: { id: parsed.data.building_id, tenant_id: gate.session.user.tenantId },
  });
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 400 });

  const floor = await prisma.floor.create({
    data: {
      tenant_id: gate.session.user.tenantId,
      building_id: building.id,
      name: parsed.data.name.trim(),
      level: parsed.data.level ?? 0,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `floor.create:${floor.name}`);
  return NextResponse.json(floor);
}
