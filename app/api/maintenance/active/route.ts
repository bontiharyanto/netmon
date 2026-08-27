import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;

  const now = new Date();
  const rows = await prisma.maintenance_window.findMany({
    where: {
      tenant_id: gate.session.user.tenantId,
      starts_at: { lte: now },
      ends_at: { gt: now },
    },
    orderBy: { ends_at: "asc" },
  });
  return NextResponse.json(rows);
}
