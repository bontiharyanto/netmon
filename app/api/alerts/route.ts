import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { device: true },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(alerts);
}
