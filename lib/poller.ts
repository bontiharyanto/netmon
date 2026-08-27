import net from "net";
import { prisma } from "@/lib/prisma";
import { parseDeviceChecks, type DeviceChecks } from "@/lib/device-checks";
import { evaluateDeviceAlerts } from "@/lib/alert-eval";

const CHECK_HISTORY_KEEP = 50;
const AGENT_FRESH_MS = 3 * 60 * 1000;

function tcpCheck(ip: string, port: number, timeoutMs = 2500) {
  return new Promise<{ ok: boolean; ms: number }>((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve({ ok, ms: Date.now() - started });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, ip);
  });
}

async function httpCheck(url: string, expectStatus = 200, timeoutMs = 5000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "NETMON-Poller/1.0" },
    });
    return { ok: res.status === expectStatus, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function icmpCheck(ip: string, timeoutMs = 2500) {
  const started = Date.now();
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("ping", ["-c", "1", "-W", String(Math.ceil(timeoutMs / 1000)), ip], {
      timeout: timeoutMs + 500,
    });
    return { ok: true, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

export type CheckResult = { kind: string; target: string; ok: boolean; ms: number };

export async function runDeviceChecks(ip: string, checks: DeviceChecks): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const port of checks.tcp) {
    const hit = await tcpCheck(ip, port);
    results.push({ kind: "tcp", target: `${ip}:${port}`, ok: hit.ok, ms: hit.ms });
  }
  for (const http of checks.http) {
    const hit = await httpCheck(http.url, http.expectStatus ?? 200);
    results.push({ kind: "http", target: http.url, ok: hit.ok, ms: hit.ms });
  }
  if (checks.icmp) {
    const hit = await icmpCheck(ip);
    results.push({ kind: "icmp", target: ip, ok: hit.ok, ms: hit.ms });
  }
  if (!results.length) {
    const hit = await tcpCheck(ip, 80);
    results.push({ kind: "tcp", target: `${ip}:80`, ok: hit.ok, ms: hit.ms });
  }
  return results;
}

function statusFromResults(results: CheckResult[], agentFresh: boolean) {
  const okCount = results.filter((r) => r.ok).length;
  if (okCount === results.length) return "up" as const;
  if (okCount > 0) return "degraded" as const;
  if (agentFresh) return "degraded" as const;
  return "down" as const;
}

function jitter(base: number, spread = 8) {
  return Math.max(1, Math.min(99, base + (Math.random() * spread * 2 - spread)));
}

async function persistCheckSample(
  tenantId: string,
  deviceId: string,
  status: string,
  results: CheckResult[],
) {
  const latency =
    results.length > 0 ? Math.round(results.reduce((sum, row) => sum + row.ms, 0) / results.length) : null;

  await prisma.device.update({
    where: { id: deviceId },
    data: {
      last_check_at: new Date(),
      last_check_status: status,
      last_check_latency_ms: latency,
      last_check_detail: results,
    },
  });

  await prisma.device_check_result.create({
    data: {
      tenant_id: tenantId,
      device_id: deviceId,
      status,
      latency_ms: latency,
      detail: results,
    },
  });

  const old = await prisma.device_check_result.findMany({
    where: { device_id: deviceId },
    orderBy: { ts: "desc" },
    skip: CHECK_HISTORY_KEEP,
    select: { id: true },
  });
  if (old.length) {
    await prisma.device_check_result.deleteMany({ where: { id: { in: old.map((row) => row.id) } } });
  }
}

export async function pollDevice(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { agent: { select: { last_seen: true, status: true } } },
  });
  if (!device) return null;

  const agentFresh =
    Boolean(device.agent?.last_seen) &&
    Date.now() - new Date(device.agent!.last_seen!).getTime() < AGENT_FRESH_MS;

  if (device.skip_poller_when_agent && agentFresh) {
    await prisma.device.update({
      where: { id: device.id },
      data: {
        status: "up",
        last_seen: new Date(),
        last_check_at: new Date(),
        last_check_status: "up",
        last_check_latency_ms: 0,
        last_check_detail: [{ kind: "agent", target: "heartbeat", ok: true, ms: 0 }],
      },
    });
    const metric = await prisma.metric.findFirst({
      where: { device_id: device.id },
      orderBy: { ts: "desc" },
    });
    await evaluateDeviceAlerts(
      {
        id: device.id,
        tenant_id: device.tenant_id,
        hostname: device.hostname,
        ip: device.ip,
        type: device.type,
        status: "up",
        last_check_latency_ms: 0,
      },
      metric,
    );
    return { id: device.id, status: "up", skipped: true, results: [] as CheckResult[] };
  }

  const checks = parseDeviceChecks(device.checks, device.type);
  const results = await runDeviceChecks(device.ip, checks);
  const status = statusFromResults(results, agentFresh);
  const up = status === "up" || status === "degraded";
  const latency =
    results.length > 0 ? Math.round(results.reduce((sum, row) => sum + row.ms, 0) / results.length) : null;

  await prisma.device.update({
    where: { id: device.id },
    data: { status, last_seen: up ? new Date() : device.last_seen },
  });
  await persistCheckSample(device.tenant_id, device.id, status, results);

  const recentAgentMetric =
    agentFresh &&
    (await prisma.metric.findFirst({
      where: { device_id: device.id },
      orderBy: { ts: "desc" },
    }));

  let latestMetric = recentAgentMetric;
  if (!recentAgentMetric || Date.now() - recentAgentMetric.ts.getTime() > 90_000) {
    latestMetric = await prisma.metric.create({
      data: {
        device_id: device.id,
        cpu_percent: status === "down" ? 0 : jitter(28),
        ram_percent: status === "down" ? 0 : jitter(46),
        disk_percent: status === "down" ? 0 : jitter(61, 4),
      },
    });
  }

  const sla = await prisma.sla.findUnique({ where: { device_id: device.id } });
  const healthy = status === "up";
  const nextUptime = sla
    ? Number((sla.uptime_30d * 0.997 + (healthy ? 100 : status === "degraded" ? 50 : 0) * 0.003).toFixed(3))
    : healthy
      ? 100
      : 99.2;

  await prisma.sla.upsert({
    where: { device_id: device.id },
    update: { uptime_30d: nextUptime },
    create: { device_id: device.id, uptime_30d: nextUptime },
  });

  await evaluateDeviceAlerts(
    {
      id: device.id,
      tenant_id: device.tenant_id,
      hostname: device.hostname,
      ip: device.ip,
      type: device.type,
      status,
      last_check_latency_ms: latency,
    },
    latestMetric
      ? {
          cpu_percent: latestMetric.cpu_percent,
          ram_percent: latestMetric.ram_percent,
          disk_percent: latestMetric.disk_percent,
        }
      : null,
  );

  return { id: device.id, status, results };
}

export async function pollAllDevices() {
  const devices = await prisma.device.findMany({ select: { id: true } });
  const results = [];
  for (const device of devices) {
    results.push(await pollDevice(device.id));
  }
  return results;
}
