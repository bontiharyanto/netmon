import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;
  const connectors = await prisma.ticket_connector.findMany({
    where: {
      tenant_id: gate.session.user.tenantId,
      enabled: true,
      direction: { in: ["both", "outbound"] },
    },
    select: { id: true, name: true, provider: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ connectors });
}
