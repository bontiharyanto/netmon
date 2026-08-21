import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { generateInsights } from "@/lib/ai";

export async function GET() {
  try {
    const gate = await requirePermission("ai.use");
    if (gate.error || !gate.session) return gate.error;
    const insights = await generateInsights(gate.session.user.tenantId);
    return NextResponse.json(insights);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
