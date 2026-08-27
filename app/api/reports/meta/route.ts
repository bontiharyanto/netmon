import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { reportMeta } from "@/lib/reports";

export async function GET() {
  const gate = await requirePermission("reports.export");
  if (gate.error || !gate.session) return gate.error;

  const meta = await reportMeta(gate.session.user.tenantId);
  return NextResponse.json(meta);
}
