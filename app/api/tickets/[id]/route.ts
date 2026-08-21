import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;
  const ticket = await prisma.ticket.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    include: {
      connector: { select: { name: true, provider: true, direction: true } },
      alert: { include: { device: true } },
      comments: { orderBy: { created_at: "asc" } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ticket });
}
