import { prisma } from "@/lib/prisma";
import { getAiRuntime } from "@/lib/ai-config";
import { askOpenAiCompatible, testLlmEndpoint } from "@/lib/ai-llm";

type AskInput = {
  tenantId: string;
  question: string;
};

export async function answerTenantQuestion({ tenantId, question }: AskInput) {
  const runtime = await getAiRuntime(tenantId);
  if (!runtime.enabled || !runtime.copilotEnabled) {
    return { source: "off" as const, answer: "NETMON AI copilot is disabled for this tenant. Enable it in Settings → AI integration." };
  }

  const snapshot = await loadSnapshot(tenantId);
  const local = buildLocalAnswer({ question, ...snapshot });

  if (!runtime.llmReady) {
    return { source: "rules" as const, answer: local, mode: runtime.mode };
  }

  try {
    const llm = await askOpenAiCompatible({
      question,
      context: local,
      inventory: snapshot.devices.map((d) => `${d.hostname} ${d.ip} ${d.status}`).join("\n"),
      runtime: {
        provider: runtime.provider,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        apiKey: runtime.apiKey,
      },
    });
    return {
      source: runtime.mode === "local" ? ("local-llm" as const) : ("cloud" as const),
      answer: llm || local,
      mode: runtime.mode,
      provider: runtime.provider,
    };
  } catch (error) {
    const hint = error instanceof Error ? error.message : "LLM unavailable";
    return { source: "rules" as const, answer: `${local}\n\nLLM fallback: ${hint}`, mode: runtime.mode };
  }
}

export async function generateInsights(tenantId: string) {
  const runtime = await getAiRuntime(tenantId);
  const snapshot = await loadSnapshot(tenantId);
  const health = snapshot.devices.length
    ? Math.round((snapshot.up.length / snapshot.devices.length) * 100)
    : 100;

  const cards = [
    {
      id: "health",
      title: "Network health",
      severity: health < 90 ? "critical" : snapshot.degraded.length ? "warning" : "ok",
      body: `${health}% assets up · ${snapshot.down.length} down · ${snapshot.degraded.length} degraded · ${snapshot.alerts.length} firing.`,
    },
    {
      id: "rca",
      title: "Likely root cause",
      severity: snapshot.down.length ? "critical" : snapshot.degraded.length ? "warning" : "ok",
      body: snapshot.down.length
        ? `Start at ${snapshot.down[0].hostname}. Neighbor path and last change on that node before touching the rest of the fabric.`
        : snapshot.degraded.length
          ? `No hard down. Inspect degraded hop ${snapshot.degraded[0].hostname} — access flapping is more likely than core failure.`
          : "No active outage. Topology looks stable.",
    },
    {
      id: "sla",
      title: "SLA risk",
      severity: (snapshot.worst[0]?.uptime_30d ?? 100) < 99 ? "warning" : "ok",
      body: snapshot.worst.length
        ? snapshot.worst.map((row) => `${row.device.hostname} ${row.uptime_30d.toFixed(2)}%`).join(" · ")
        : "No SLA samples yet.",
    },
    {
      id: "capacity",
      title: "Capacity (24h avg)",
      severity: snapshot.capacity.cpu > 80 || snapshot.capacity.ram > 85 ? "warning" : "ok",
      body: `CPU ${snapshot.capacity.cpu}% · RAM ${snapshot.capacity.ram}% · Disk ${snapshot.capacity.disk}%. ${
        snapshot.capacity.cpu > 80 ? "CPU pressure — schedule capacity review." : "Headroom is acceptable."
      }`,
    },
    {
      id: "actions",
      title: "Recommended actions",
      severity: snapshot.alerts.length ? "warning" : "ok",
      body: snapshot.down.length
        ? `1. Restore ${snapshot.down.map((d) => d.hostname).join(", ")}. 2. Verify uplink on degraded nodes. 3. Notify via configured channels.`
        : "No restore needed. Keep watching SLA outliers and confirm poller interval.",
    },
  ];

  return {
    enabled: runtime.enabled && runtime.insightsEnabled,
    engine: runtime.llmReady ? runtime.provider : "rules",
    mode: runtime.mode,
    generatedAt: new Date().toISOString(),
    cards: runtime.enabled && runtime.insightsEnabled ? cards : [],
    message:
      !runtime.enabled || !runtime.insightsEnabled
        ? "AI insights are disabled. Enable them in Settings → AI integration."
        : null,
  };
}

async function loadSnapshot(tenantId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [devices, alerts, slas, metrics] = await Promise.all([
    prisma.device.findMany({
      where: { tenant_id: tenantId },
      include: { sla: true },
      orderBy: { hostname: "asc" },
    }),
    prisma.alert.findMany({
      where: { tenant_id: tenantId, status: "firing" },
      include: { device: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.sla.findMany({ include: { device: true } }),
    prisma.metric.findMany({
      where: { device: { tenant_id: tenantId }, ts: { gte: since } },
    }),
  ]);

  const tenantSlas = slas.filter((row) => row.device.tenant_id === tenantId);
  const avg = (values: number[]) =>
    values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;

  return {
    devices,
    alerts,
    up: devices.filter((d) => d.status === "up"),
    down: devices.filter((d) => d.status === "down"),
    degraded: devices.filter((d) => d.status === "degraded"),
    worst: [...tenantSlas].sort((a, b) => a.uptime_30d - b.uptime_30d).slice(0, 3),
    capacity: {
      cpu: avg(metrics.map((m) => m.cpu_percent)),
      ram: avg(metrics.map((m) => m.ram_percent)),
      disk: avg(metrics.map((m) => m.disk_percent)),
    },
  };
}

function buildLocalAnswer({
  question,
  devices,
  down,
  degraded,
  alerts,
  worst,
}: {
  question: string;
  devices: { hostname: string; status: string; ip: string }[];
  down: { hostname: string }[];
  degraded: { hostname: string }[];
  alerts: { event: string; device: { hostname: string }; severity: string }[];
  worst: { uptime_30d: number; device: { hostname: string } }[];
}) {
  const q = question.toLowerCase();
  const lines = [
    `Inventory: ${devices.length} devices · ${down.length} down · ${degraded.length} degraded · ${alerts.length} firing alerts.`,
  ];

  if (q.includes("sla") || q.includes("worst") || q.includes("jelek")) {
    lines.push("Lowest 30-day SLA:", ...worst.map((row) => `• ${row.device.hostname} — ${row.uptime_30d.toFixed(2)}%`));
  } else if (q.includes("down") || q.includes("outage") || q.includes("mati")) {
    lines.push(down.length ? `Down now: ${down.map((d) => d.hostname).join(", ")}.` : "No devices are down.");
  } else if (q.includes("alert") || q.includes("incident")) {
    lines.push(
      alerts.length
        ? alerts.map((a) => `• ${a.severity} ${a.event} on ${a.device.hostname}`).join("\n")
        : "No firing alerts.",
    );
  } else if (q.includes("topology") || q.includes("root") || q.includes("cause")) {
    lines.push(
      down.length
        ? `Likely blast radius starts at ${down[0].hostname}. Check neighbor links and last change on that node before touching the rest of the path.`
        : "No hard down. Inspect degraded hops first; a flapping access layer is more likely than core failure.",
    );
  } else {
    lines.push(
      down.length ? `Priority: restore ${down.map((d) => d.hostname).join(", ")}.` : "Core path looks healthy.",
      degraded.length ? `Watch: ${degraded.map((d) => d.hostname).join(", ")}.` : "",
      worst[0] ? `SLA watch: ${worst[0].device.hostname} at ${worst[0].uptime_30d.toFixed(2)}%.` : "",
    );
  }

  lines.push("NETMON AI is tenant-scoped and read-only. It cannot change devices or bypass RBAC.");
  return lines.filter(Boolean).join("\n");
}

export async function testAiConnection(
  tenantId: string,
  overrides?: Partial<{ mode: string; provider: string; baseUrl: string; model: string; apiKey: string }>,
) {
  const runtime = await getAiRuntime(tenantId);
  const mode = overrides?.mode ?? runtime.mode;
  const provider = overrides?.provider ?? runtime.provider;
  const baseUrl = overrides?.baseUrl ?? runtime.baseUrl;
  const model = overrides?.model ?? runtime.model;
  const apiKey = overrides?.apiKey && overrides.apiKey !== "••••••••" ? overrides.apiKey : runtime.apiKey;

  if (!runtime.enabled) return { ok: false, status: "AI is disabled", models: [] as string[] };
  if (mode === "rules") return { ok: true, status: "rules engine ready (no LLM)", models: [] as string[] };
  if (mode === "cloud" && !apiKey) return { ok: false, status: "missing API key", models: [] as string[] };
  if (!baseUrl) return { ok: false, status: "missing base URL", models: [] as string[] };

  return testLlmEndpoint({ provider, baseUrl, model, apiKey });
}
