export type SnmpOidMapping = {
  key: string;
  oid: string;
  metric: "cpu_percent" | "ram_percent" | "disk_percent" | "custom";
  scale?: number;
};

export const SYSTEM_SNMP_PROFILES: { id: string; name: string; oids: SnmpOidMapping[] }[] = [
  {
    id: "sys_snmp_host_cpu",
    name: "Host CPU (HR-MIB)",
    oids: [{ key: "cpu", oid: "1.3.6.1.2.1.25.3.3.1.2.1", metric: "cpu_percent", scale: 1 }],
  },
  {
    id: "sys_snmp_if_mib",
    name: "IF-MIB basics (ifIndex 1)",
    oids: [
      { key: "ifInOctets", oid: "1.3.6.1.2.1.2.2.1.10.1", metric: "custom", scale: 1 },
      { key: "ifOutOctets", oid: "1.3.6.1.2.1.2.2.1.16.1", metric: "custom", scale: 1 },
      { key: "ifOperStatus", oid: "1.3.6.1.2.1.2.2.1.8.1", metric: "custom", scale: 1 },
    ],
  },
];

export function parseSnmpOids(raw: unknown): SnmpOidMapping[] {
  if (!Array.isArray(raw)) return [];
  const out: SnmpOidMapping[] = [];
  for (const row of raw.slice(0, 32)) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const key = String(item.key ?? "").trim();
    const oid = String(item.oid ?? "").trim();
    const metricRaw = String(item.metric ?? "custom");
    const metric =
      metricRaw === "cpu_percent" || metricRaw === "ram_percent" || metricRaw === "disk_percent"
        ? metricRaw
        : "custom";
    if (!key || !oid) continue;
    out.push({
      key,
      oid,
      metric,
      scale: typeof item.scale === "number" && Number.isFinite(item.scale) ? item.scale : 1,
    });
  }
  return out;
}
