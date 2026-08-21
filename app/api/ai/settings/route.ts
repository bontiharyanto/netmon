import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { AI_PROVIDERS, getAiProvider, isLocalLlmProvider } from "@/lib/ai-providers";
import { ensureAiSetting, mergeAiKey, publicAiSetting, normalizeAiMode } from "@/lib/ai-config";

const schema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(["rules", "local", "cloud"]).optional(),
  provider: z.string().optional(),
  base_url: z.string().optional(),
  model: z.string().optional(),
  api_key: z.string().optional(),
  copilot_enabled: z.boolean().optional(),
  insights_enabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const gate = await requirePermission("ai.manage");
    if (gate.error || !gate.session) return gate.error;
    const setting = await ensureAiSetting(gate.session.user.tenantId);
    if (!setting) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json({ setting: publicAiSetting(setting), providers: AI_PROVIDERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load AI settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requirePermission("ai.manage");
    if (gate.error || !gate.session) return gate.error;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const existing = await ensureAiSetting(gate.session.user.tenantId);
    if (!existing) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const mode = parsed.data.mode ?? normalizeAiMode(existing.mode, existing.provider);
    let provider = parsed.data.provider ?? existing.provider;
    if (mode === "local" && !isLocalLlmProvider(provider)) provider = "ollama";
    if (mode === "cloud" && isLocalLlmProvider(provider)) provider = "openai";
    const preset = getAiProvider(provider);
    const updated = await prisma.ai_setting.update({
      where: { id: existing.id },
      data: {
        enabled: parsed.data.enabled ?? existing.enabled,
        mode,
        provider,
        base_url: parsed.data.base_url ?? existing.base_url ?? preset?.base_url,
        model: parsed.data.model ?? existing.model,
        api_key: mergeAiKey(existing.api_key, parsed.data.api_key),
        copilot_enabled: parsed.data.copilot_enabled ?? existing.copilot_enabled,
        insights_enabled: parsed.data.insights_enabled ?? existing.insights_enabled,
      },
    });

    await writeAudit(gate.session.user.tenantId, gate.session.user.id, "ai.settings.update");
    return NextResponse.json({ setting: publicAiSetting(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save AI settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
