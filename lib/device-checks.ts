export const DEVICE_TYPES = [
  "switch",
  "router",
  "firewall",
  "access-point",
  "server",
  "database",
  "application",
  "service",
  "sensor",
  "olt",
  "nvr",
  "camera",
  "other",
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export type HttpCheck = {
  url: string;
  expectStatus?: number;
};

export type DeviceChecks = {
  tcp: number[];
  http: HttpCheck[];
  icmp?: boolean;
};

export const DEFAULT_CHECKS: DeviceChecks = { tcp: [80], http: [] };

export const CMDB_RELATION_TYPES = [
  "runs_on",
  "depends_on",
  "connects_to",
  "hosts",
  "backed_by",
] as const;

export type CmdbRelationType = (typeof CMDB_RELATION_TYPES)[number];

export function defaultChecksForType(type: string): DeviceChecks {
  const t = type.toLowerCase().trim();
  if (t === "database") return { tcp: [5432], http: [] };
  if (t === "application" || t === "service") return { tcp: [443], http: [] };
  if (t === "server") return { tcp: [80, 443], http: [] };
  if (t === "sensor") return { tcp: [], http: [] };
  if (t === "nvr" || t === "camera") return { tcp: [80], http: [] };
  return { ...DEFAULT_CHECKS, http: [] };
}

export function parseDeviceChecks(raw: unknown, typeFallback?: string): DeviceChecks {
  const fallback = typeFallback ? defaultChecksForType(typeFallback) : DEFAULT_CHECKS;
  if (!raw || typeof raw !== "object") return { tcp: [...fallback.tcp], http: [...fallback.http] };

  const obj = raw as Record<string, unknown>;
  const tcpRaw = Array.isArray(obj.tcp) ? obj.tcp : fallback.tcp;
  const tcp = tcpRaw
    .map((p) => Number(p))
    .filter((p) => Number.isInteger(p) && p > 0 && p <= 65535)
    .slice(0, 16);

  const httpRaw = Array.isArray(obj.http) ? obj.http : [];
  const http: HttpCheck[] = [];
  for (const item of httpRaw.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) continue;
    const expectStatus =
      typeof row.expectStatus === "number" && row.expectStatus >= 100 && row.expectStatus < 600
        ? Math.floor(row.expectStatus)
        : 200;
    http.push({ url, expectStatus });
  }

  return {
    tcp: tcp.length ? tcp : http.length ? [] : [...fallback.tcp],
    http,
    icmp: Boolean(obj.icmp),
  };
}

export function parseTcpPortsInput(value: string): number[] {
  return value
    .split(/[\s,;]+/)
    .map((part) => Number(part.trim()))
    .filter((p) => Number.isInteger(p) && p > 0 && p <= 65535)
    .slice(0, 16);
}

export function formatChecksSummary(checks: DeviceChecks) {
  const parts: string[] = [];
  if (checks.tcp.length) parts.push(`tcp:${checks.tcp.join(",")}`);
  if (checks.http.length) parts.push(`http:${checks.http.length}`);
  if (checks.icmp) parts.push("icmp");
  return parts.join(" · ") || "tcp:80";
}
