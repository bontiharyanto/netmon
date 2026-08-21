import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

const schema = z.object({
  name: z.string().min(2),
  ci_type: z.string().min(2),
  asset_tag: z.string().optional(),
  serial: z.string().optional(),
  owner: z.string().optional(),
  location: z.string().optional(),
  device_id: z.string().optional(),
});

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

  const item = await prisma.cmdb_ci.create({
    data: { ...parsed.data, tenant_id: gate.session.user.tenantId },
  });
  return NextResponse.json(item);
}
