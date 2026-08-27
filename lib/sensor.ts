export const SENSOR_KINDS = ["temperature", "humidity", "power", "other"] as const;
export type SensorKind = (typeof SENSOR_KINDS)[number];

export function defaultSensorUnit(kind: string | null | undefined): string {
  const k = (kind || "temperature").toLowerCase();
  if (k === "humidity") return "%";
  if (k === "power") return "W";
  if (k === "temperature") return "C";
  return "";
}

/** Resolve a simple dotted path (no arrays): "temp_c" or "data.temp". */
export function readJsonPath(data: unknown, path: string): unknown {
  const parts = path
    .replace(/^\$\.?/, "")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: unknown = data;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function toSensorNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function pollSensorHttp(opts: {
  url: string;
  jsonPath: string;
  expectStatus?: number;
  timeoutMs?: number;
}): Promise<{ ok: boolean; ms: number; value: number | null; error?: string }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);
  try {
    const res = await fetch(opts.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "NETMON-Poller/1.0", Accept: "application/json" },
    });
    const ms = Date.now() - started;
    const expect = opts.expectStatus ?? 200;
    if (res.status !== expect) {
      return { ok: false, ms, value: null, error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, ms, value: null, error: "Invalid JSON" };
    }
    const raw = readJsonPath(json, opts.jsonPath || "temp_c");
    const value = toSensorNumber(raw);
    if (value == null) {
      return { ok: false, ms, value: null, error: `Path ${opts.jsonPath || "temp_c"} missing` };
    }
    return { ok: true, ms, value };
  } catch {
    return { ok: false, ms: Date.now() - started, value: null, error: "Sensor fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}
