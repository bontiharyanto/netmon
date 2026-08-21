import {
  getAiProvider,
  isLocalLlmProvider,
  openaiBase,
  originFromBase,
} from "@/lib/ai-providers";

export type LlmRuntime = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
};

function headers(apiKey?: string) {
  const next: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) next.Authorization = `Bearer ${apiKey}`;
  return next;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 240) };
    }
    return { res, json, text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("timed out connecting to the LLM server");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function listLlmModels(runtime: LlmRuntime) {
  const provider = getAiProvider(runtime.provider);
  const models: string[] = [];

  if (provider?.native === "ollama" || runtime.provider === "ollama") {
    try {
      const { res, json } = await fetchJson(`${originFromBase(runtime.baseUrl)}/api/tags`, { headers: headers(runtime.apiKey) }, 8000);
      if (res.ok && json && typeof json === "object" && Array.isArray((json as { models?: { name?: string }[] }).models)) {
        for (const item of (json as { models: { name?: string }[] }).models) {
          if (item.name) models.push(item.name);
        }
      }
    } catch {
      // fall through to OpenAI-compatible /models
    }
  }

  if (models.length === 0) {
    const { res, json } = await fetchJson(`${openaiBase(runtime.baseUrl)}/models`, { headers: headers(runtime.apiKey || "ollama") }, 8000);
    if (!res.ok) {
      throw new Error(`models endpoint returned ${res.status}`);
    }
    const data = (json as { data?: { id?: string }[] })?.data ?? [];
    for (const item of data) {
      if (item.id) models.push(item.id);
    }
  }

  return models;
}

export async function testLlmEndpoint(runtime: LlmRuntime) {
  try {
    const models = await listLlmModels(runtime);
    const label = getAiProvider(runtime.provider)?.name ?? runtime.provider;
    const sample = models.slice(0, 4).join(", ");
    return {
      ok: true,
      status: models.length
        ? `connected to ${label} · ${models.length} model${models.length === 1 ? "" : "s"}${sample ? ` (${sample})` : ""}`
        : `connected to ${label} · no models listed`,
      models,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unreachable";
    const dockerHint = runtime.baseUrl.includes("127.0.0.1") || runtime.baseUrl.includes("localhost")
      ? " If NETMON is in Docker, use host.docker.internal instead of 127.0.0.1."
      : "";
    return { ok: false, status: `${message}.${dockerHint}`, models: [] as string[] };
  }
}

export async function askOpenAiCompatible({
  runtime,
  question,
  context,
  inventory,
}: {
  runtime: LlmRuntime;
  question: string;
  context: string;
  inventory: string;
}) {
  const timeoutMs = isLocalLlmProvider(runtime.provider) ? 90000 : 25000;
  const url = `${openaiBase(runtime.baseUrl)}/chat/completions`;
  const { res, json } = await fetchJson(
    url,
    {
      method: "POST",
      headers: headers(runtime.apiKey || (isLocalLlmProvider(runtime.provider) ? "ollama" : "")),
      body: JSON.stringify({
        model: runtime.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are NETMON AI, a concise NOC copilot. Use only the tenant context. Never reveal secrets, tokens, or other tenants. English, professional, short.",
          },
          { role: "user", content: `Context:\n${context}\n\nInventory:\n${inventory}\n\nQuestion: ${question}` },
        ],
      }),
    },
    timeoutMs,
  );

  if (!res.ok) {
    const err = json && typeof json === "object" ? (json as { error?: { message?: string } }).error?.message : null;
    throw new Error(err || `LLM returned ${res.status}`);
  }

  return (json as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
}
