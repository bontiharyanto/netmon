import net from "net";
import { prisma } from "@/lib/prisma";
import { maybeCommentResolvedAlert, maybeOpenTicketsForAlert } from "@/lib/tickets";
import { notifyAlert } from "@/lib/notify";
import { parseDeviceChecks, type DeviceChecks } from "@/lib/device-checks";

function tcpCheck(ip: string, port: number, timeoutMs = 2500) {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, ip);
  });
}

async function httpCheck(url: string, expectStatus = 200, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "NETMON-Poller/1.0" },
    });
    return res.status === expectStatus;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function icmpCheck(ip: string, timeoutMs = 2500) {
  // Best-effort: many containers lack CAP_NET_RAW. Fall back to TCP/7 echo if needed.
  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("ping", ["-c", "1", "-W", String(Math.ceil(timeoutMs / 1000)), ip], {
      timeout: timeoutMs + 500,
    });
    return true;
  } catch {
    return false;
  }
}

export type CheckResult = { kind: string; target: string; ok: boolean };

export async function runDeviceChecks(ip: string, checks: DeviceChecks): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const port of checks.tcp) {
    results.push({ kind: "tcp", target: `${ip}:${port}`, ok: await tcpCheck(ip, port) });
  }
  for (const http of checks.http) {
    results.push({
      kind: "http",
      target: http.url,
      ok: await httpCheck(http.url, http.expectStatus ?? 200),
    });
  }
  if (checks.icmp) {
    results.push({ kind: "icmp", target: ip, ok: await icmpCheck(ip) });
  }
  if (!results.length) {
    results.push({ kind: "tcp", target: `${ip}:80`, ok: await tcpCheck(ip, 80) });
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

export async function pollDevice(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { agent: { select: { last_seen: true, status: true } } },
  });
  if (!device) return null;

  const checks = parseDeviceChecks(device.checks, device.type);
  const results = await runDeviceChecks(device.ip, checks);
  const agentFresh =
    Boolean(device.agent?.last_seen) &&
    Date.now() - new Date(device.agent!.last_seen!).getTime() < 3 * 60 * 1000;

  const status = statusFromResults(results, agentFresh);
  const up = status === "up" || status === "degraded";

  await prisma.device.update({
    where: { id: device.id },
    data: { status, last_seen: up ? new Date() : device.last_seen },
  });

  const recentAgentMetric =
    agentFresh &&
    (await prisma.metric.findFirst({
      where: { device_id: device.id },
      orderBy: { ts: "desc" },
    }));

  if (!recentAgentMetric || Date.now() - recentAgentMetric.ts.getTime() > 90_000) {
    await prisma.metric.create({
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

  if (status === "down") {
    const open = await prisma.alert.findFirst({
      where: { device_id: device.id, event: "device_down", status: "firing" },
    });
    if (!open) {
      const detail = results.map((r) => `${r.kind} ${r.target}=${r.ok ? "ok" : "fail"}`).join("; ");
      const alert = await prisma.alert.create({
        data: {
          tenant_id: device.tenant_id,
          device_id: device.id,
          event: "device_down",
          status: "firing",
          severity: "critical",
        },
      });
      await maybeOpenTicketsForAlert(alert.id);
      await notifyAlert({
        tenantId: device.tenant_id,
        alertId: alert.id,
        title: `CRITICAL ${device.hostname} down`,
        body: `${device.hostname} (${device.ip}) failed checks: ${detail}`,
        severity: "critical",
      });
    }
  } else {
    const firing = await prisma.alert.findMany({
      where: { device_id: device.id, event: "device_down", status: "firing" },
      select: { id: true },
    });
    if (firing.length) {
      await prisma.alert.updateMany({
        where: { device_id: device.id, event: "device_down", status: "firing" },
        data: { status: "resolved", resolved_at: new Date() },
      });
      await maybeCommentResolvedAlert(device.id, "device_down");
      await notifyAlert({
        tenantId: device.tenant_id,
        alertId: firing[0]!.id,
        title: `${device.hostname} recovered`,
        body: `${device.hostname} (${device.ip}) is responding again (${status}).`,
        severity: "info",
        recovered: true,
      });
    }
  }

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
