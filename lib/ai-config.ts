import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret, isMasked } from "@/lib/crypto";
import {
  AI_PROVIDERS,
  getAiProvider,
  isLocalLlmProvider,
  type AiMode,
} from "@/lib/ai-providers";

export function normalizeAiMode(mode?: string | null, provider?: string | null): AiMode {
  if (mode === "rules") return "rules";
  if (isLocalLlmProvider(provider)) return "local";
  if (mode === "cloud") return "cloud";
  return "rules";
}

export async function ensureAiSetting(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return null;

  const created = await prisma.ai_setting.upsert({
    where: { tenant_id: tenantId },
    update: {},
    create: {
      tenant_id: tenantId,
      enabled: true,
      mode: "rules",
      provider: "ollama",
      base_url: process.env.AI_BASE_URL ?? "http://127.0.0.1:11434/v1",
      model: process.env.AI_MODEL ?? "llama3.1",
      api_key: process.env.AI_API_KEY ? encryptSecret(process.env.AI_API_KEY) : null,
      copilot_enabled: true,
      insights_enabled: true,
    },
  });

  const mode = normalizeAiMode(created.mode, created.provider);
  if (created.mode !== mode) {
    return prisma.ai_setting.update({ where: { id: created.id }, data: { mode } });
  }
  return created;
}

export async function getAiRuntime(tenantId: string) {
  const setting = await ensureAiSetting(tenantId);
  const envKey = process.env.AI_API_KEY ?? "";
  const storedKey = setting?.api_key ? decryptSecret(setting.api_key) : "";
  const apiKey = storedKey || envKey;
  const mode = normalizeAiMode(setting?.mode, setting?.provider);
  const provider = setting?.provider ?? "ollama";
  const baseUrl = setting?.base_url || process.env.AI_BASE_URL || "http://127.0.0.1:11434/v1";
  const llmReady =
    Boolean(setting?.enabled) &&
    ((mode === "local" && Boolean(baseUrl)) || (mode === "cloud" && Boolean(apiKey)));

  return {
    setting,
    enabled: setting?.enabled ?? true,
    mode,
    provider,
    baseUrl,
    model: setting?.model || process.env.AI_MODEL || "llama3.1",
    apiKey,
    copilotEnabled: setting?.copilot_enabled ?? true,
    insightsEnabled: setting?.insights_enabled ?? true,
    llmReady,
    cloudReady: llmReady,
    hasKey: Boolean(apiKey),
  };
}

export function publicAiSetting(setting: NonNullable<Awaited<ReturnType<typeof ensureAiSetting>>>) {
  const provider = getAiProvider(setting.provider);
  return {
    enabled: setting.enabled,
    mode: normalizeAiMode(setting.mode, setting.provider),
    provider: setting.provider,
    base_url: setting.base_url,
    model: setting.model,
    api_key: setting.api_key ? "••••••••" : "",
    has_key: Boolean(setting.api_key),
    copilot_enabled: setting.copilot_enabled,
    insights_enabled: setting.insights_enabled,
    last_tested_at: setting.last_tested_at?.toISOString() ?? null,
    last_status: setting.last_status,
    provider_name: provider?.name ?? setting.provider,
    models: provider ? [...provider.models] : [setting.model],
    needs_key: provider?.needs_key ?? false,
  };
}

export function mergeAiKey(existing: string | null, incoming?: string | null) {
  if (incoming == null || incoming === "" || isMasked(incoming)) return existing;
  return encryptSecret(incoming);
}

export { AI_PROVIDERS };
