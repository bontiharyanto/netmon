import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { answerTenantQuestion } from "@/lib/ai";

const schema = z.object({ question: z.string().min(3).max(500) });

export async function POST(req: Request) {
  const gate = await requirePermission("ai.use");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400 });

  const result = await answerTenantQuestion({
    tenantId: gate.session.user.tenantId,
    question: parsed.data.question,
  });
  return NextResponse.json(result);
}
