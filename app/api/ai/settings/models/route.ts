import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/rbac";
import { getAiRuntime } from "@/lib/ai-config";
import { listLlmModels } from "@/lib/ai-llm";

const schema = z.object({
  provider: z.string().optional(),
  base_url: z.string().optional(),
  api_key: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const gate = await requirePermission("ai.manage");
    if (gate.error || !gate.session) return gate.error;
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    const body = parsed.success ? parsed.data : {};
    const runtime = await getAiRuntime(gate.session.user.tenantId);
    const models = await listLlmModels({
      provider: body.provider ?? runtime.provider,
      baseUrl: body.base_url ?? runtime.baseUrl,
      model: runtime.model,
      apiKey: body.api_key && body.api_key !== "••••••••" ? body.api_key : runtime.apiKey,
    });
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list models";
    return NextResponse.json({ error: message, models: [] }, { status: 400 });
  }
}
