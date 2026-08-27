import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(240).optional(),
});

export async function GET() {
  const gate = await requirePermission("assets.read");
  if (gate.error || !gate.session) return gate.error;

  const buildings = await prisma.building.findMany({
    where: { tenant_id: gate.session.user.tenantId },
    include: {
      floors: {
        orderBy: [{ level: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          level: true,
          image_mime: true,
          updated_at: true,
          _count: { select: { placements: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    buildings.map((building) => ({
      ...building,
      floors: building.floors.map(({ image_mime, ...floor }) => ({
        ...floor,
        has_image: Boolean(image_mime),
      })),
    })),
  );
}

export async function POST(req: Request) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const building = await prisma.building.create({
    data: {
      tenant_id: gate.session.user.tenantId,
      name: parsed.data.name.trim(),
      address: parsed.data.address?.trim() || null,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `building.create:${building.name}`);
  return NextResponse.json(building);
}
