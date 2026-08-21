import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard-data";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getDashboardOverview(session.user.tenantId));
}
