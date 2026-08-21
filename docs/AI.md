# NETMON AI

Paths: `/dashboard/ai` (NOC) and `/portal/ai` (viewer). Settings: **Admin → Settings → AI integration**.

AI is tenant-scoped. It must not write to devices, bypass RBAC, or read another tenant.

## Modes

| Mode | When | Network |
| --- | --- | --- |
| **Rules** | Default, including on-prem without a key | Local Prisma rules only |
| **Local LLM** | Ollama, LM Studio, vLLM, llama.cpp, LocalAI, custom OpenAI-compatible | LAN / same host |
| **Cloud** | OpenAI, Azure, Groq, Gemini, … when an API key is set | Egress to the provider |

From Docker, local runtimes use `http://host.docker.internal:{port}/v1` (compose already adds `extra_hosts`).

## What it answers

- Summarize firing alerts in operator language
- Root-cause hint from topology + neighbor status
- Natural questions (“which devices have poor SLA?”)
- Capacity hints from 24h CPU/RAM/disk
- Portal-safe answers (no other users, no tokens)

## API

`POST /api/ai/ask` body `{ question }` — session required.

Insights: `GET /api/ai/insights`.

Settings: `GET/PUT /api/ai/settings`, `POST /api/ai/settings/test`, `GET /api/ai/settings/models`.

## Env fallback

If the tenant has no stored key, `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` apply. Leave `AI_API_KEY` empty for rules or local Ollama.
