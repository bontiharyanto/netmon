export const LOCAL_LLM_PROVIDERS = [
  {
    id: "ollama",
    name: "Ollama",
    hint: "Install on the same server or LAN. Default port 11434.",
    base_url: "http://127.0.0.1:11434/v1",
    docker_url: "http://host.docker.internal:11434/v1",
    models: ["llama3.1", "llama3.2", "mistral", "qwen2.5", "gemma2", "phi4"],
    needs_key: false,
    native: "ollama" as const,
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    hint: "Start the local server in LM Studio (Developer → Start server).",
    base_url: "http://127.0.0.1:1234/v1",
    docker_url: "http://host.docker.internal:1234/v1",
    models: ["local-model"],
    needs_key: false,
    native: "openai" as const,
  },
  {
    id: "vllm",
    name: "vLLM",
    hint: "OpenAI-compatible server, typically port 8000.",
    base_url: "http://127.0.0.1:8000/v1",
    docker_url: "http://host.docker.internal:8000/v1",
    models: ["meta-llama/Llama-3.1-8B-Instruct"],
    needs_key: false,
    native: "openai" as const,
  },
  {
    id: "llamacpp",
    name: "llama.cpp",
    hint: "llama-server --port 8080",
    base_url: "http://127.0.0.1:8080/v1",
    docker_url: "http://host.docker.internal:8080/v1",
    models: ["local"],
    needs_key: false,
    native: "openai" as const,
  },
  {
    id: "localai",
    name: "LocalAI",
    hint: "Drop-in OpenAI-compatible on-prem runtime.",
    base_url: "http://127.0.0.1:8080/v1",
    docker_url: "http://host.docker.internal:8080/v1",
    models: ["gpt-4"],
    needs_key: false,
    native: "openai" as const,
  },
  {
    id: "openai-compat",
    name: "Custom local endpoint",
    hint: "Any OpenAI-compatible URL on your network.",
    base_url: "http://127.0.0.1:11434/v1",
    docker_url: "http://host.docker.internal:11434/v1",
    models: ["local-model"],
    needs_key: false,
    native: "openai" as const,
  },
] as const;

export const CLOUD_LLM_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    hint: "api.openai.com",
    base_url: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    needs_key: true,
    native: "openai" as const,
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    hint: "Replace the resource and deployment names.",
    base_url: "https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT",
    models: ["gpt-4o-mini", "gpt-4o"],
    needs_key: true,
    native: "azure" as const,
  },
  {
    id: "groq",
    name: "Groq",
    hint: "Hosted OpenAI-compatible API.",
    base_url: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    needs_key: true,
    native: "openai" as const,
  },
  {
    id: "custom",
    name: "Custom cloud endpoint",
    hint: "Any HTTPS OpenAI-compatible gateway.",
    base_url: "https://api.example.com/v1",
    models: ["custom-model"],
    needs_key: true,
    native: "openai" as const,
  },
] as const;

export const AI_PROVIDERS = [...LOCAL_LLM_PROVIDERS, ...CLOUD_LLM_PROVIDERS];

export const AI_MODES = [
  {
    id: "rules" as const,
    label: "Rules",
    blurb: "Built-in engine. No LLM, no outbound calls. Default for air-gapped on-prem.",
  },
  {
    id: "local" as const,
    label: "Local LLM",
    blurb: "Ollama, LM Studio, vLLM, llama.cpp, or any OpenAI-compatible server on this host or LAN.",
  },
  {
    id: "cloud" as const,
    label: "Cloud LLM",
    blurb: "OpenAI-compatible cloud. Tenant context only. Never used unless you set a key.",
  },
];

export type AiMode = (typeof AI_MODES)[number]["id"];
export type AiProviderId = (typeof AI_PROVIDERS)[number]["id"];

export function getAiProvider(id?: string | null) {
  return AI_PROVIDERS.find((item) => item.id === id);
}

export function isLocalLlmProvider(id?: string | null) {
  return LOCAL_LLM_PROVIDERS.some((item) => item.id === id);
}

export function openaiBase(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

export function originFromBase(baseUrl: string) {
  return baseUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

export function dockerHostUrl(id?: string | null) {
  return LOCAL_LLM_PROVIDERS.find((item) => item.id === id)?.docker_url;
}
