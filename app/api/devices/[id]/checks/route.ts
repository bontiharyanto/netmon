import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.read");
  if (gate.error || !gate.session) return gate.error;

  const device = await prisma.device.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    select: { id: true },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

  const rows = await prisma.device_check_result.findMany({
    where: { device_id: device.id, tenant_id: gate.session.user.tenantId },
    orderBy: { ts: "desc" },
    take: limit,
  });
  return NextResponse.json(rows);
}
