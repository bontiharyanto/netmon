import { prisma } from "@/lib/prisma";

export async function getDashboardOverview(tenantId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [tenant, devices, firing, recentAlerts, metrics, agents, links] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
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
    prisma.alert.findMany({
      where: { tenant_id: tenantId },
      include: { device: true },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
    prisma.metric.findMany({
      where: { device: { tenant_id: tenantId }, ts: { gte: since } },
      orderBy: { ts: "asc" },
    }),
    prisma.agent.findMany({ where: { tenant_id: tenantId } }),
    prisma.device_link.count({ where: { tenant_id: tenantId } }),
  ]);

  const up = devices.filter((d) => d.status === "up").length;
  const down = devices.filter((d) => d.status === "down").length;
  const degraded = devices.filter((d) => d.status === "degraded").length;
  const unknown = devices.filter((d) => d.status === "unknown").length;
  const slaValues = devices.map((d) => d.sla?.uptime_30d ?? 100);
  const sla30d = slaValues.length ? slaValues.reduce((a, b) => a + b, 0) / slaValues.length : 100;

  const buckets = new Map<string, { cpu: number[]; ram: number[]; disk: number[] }>();
  for (const row of metrics) {
    const key = `${row.ts.getHours().toString().padStart(2, "0")}:00`;
    const current = buckets.get(key) ?? { cpu: [], ram: [], disk: [] };
    current.cpu.push(row.cpu_percent);
    current.ram.push(row.ram_percent);
    current.disk.push(row.disk_percent);
    buckets.set(key, current);
  }

  const avg = (values: number[]) =>
    values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;

  const series = Array.from(buckets.entries()).map(([t, values]) => ({
    t,
    cpu: avg(values.cpu),
    ram: avg(values.ram),
    disk: avg(values.disk),
  }));

  const typesMap = new Map<string, { total: number; up: number }>();
  const locMap = new Map<string, { total: number; up: number; down: number }>();
  for (const device of devices) {
    const type = typesMap.get(device.type) ?? { total: 0, up: 0 };
    type.total += 1;
    if (device.status === "up") type.up += 1;
    typesMap.set(device.type, type);

    const loc = device.location ?? "Unassigned";
    const location = locMap.get(loc) ?? { total: 0, up: 0, down: 0 };
    location.total += 1;
    if (device.status === "up") location.up += 1;
    if (device.status === "down") location.down += 1;
    locMap.set(loc, location);
  }

  return {
    tenant: tenant
      ? { name: tenant.name, slug: tenant.slug, plan: tenant.plan, brand_color: tenant.brand_color }
      : null,
    kpis: {
      devices: devices.length,
      up,
      down,
      degraded,
      unknown,
      firing: firing.length,
      sla30d: Number(sla30d.toFixed(2)),
      availability: devices.length ? Number(((up / devices.length) * 100).toFixed(1)) : 100,
      agentsOnline: agents.filter((a) => a.status === "online").length,
      agents: agents.length,
      links,
    },
    series,
    types: Array.from(typesMap.entries()).map(([name, value]) => ({ name, ...value })),
    locations: Array.from(locMap.entries()).map(([name, value]) => ({ name, ...value })),
    worstSla: devices
      .slice()
      .sort((a, b) => (a.sla?.uptime_30d ?? 100) - (b.sla?.uptime_30d ?? 100))
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        hostname: d.hostname,
        ip: d.ip,
        status: d.status,
        sla: d.sla?.uptime_30d ?? 100,
      })),
    devices: devices.map((d) => ({
      id: d.id,
      hostname: d.hostname,
      ip: d.ip,
      type: d.type,
      status: d.status,
      location: d.location,
      vendor: d.vendor,
      last_seen: d.last_seen?.toISOString() ?? null,
      sla: d.sla?.uptime_30d ?? 100,
    })),
    alerts: recentAlerts.map((a) => ({
      id: a.id,
      event: a.event,
      status: a.status,
      severity: a.severity,
      created_at: a.created_at.toISOString(),
      hostname: a.device.hostname,
    })),
    generatedAt: new Date().toISOString(),
  };
}

export type DashboardOverview = Awaited<ReturnType<typeof getDashboardOverview>>;
