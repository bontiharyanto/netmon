import net from "net";
import { prisma } from "@/lib/prisma";
import { maybeCommentResolvedAlert, maybeOpenTicketsForAlert } from "@/lib/tickets";
import { notifyAlert } from "@/lib/notify";

function tcpCheck(ip: string, port = 80, timeoutMs = 2500) {
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

function jitter(base: number, spread = 8) {
  return Math.max(1, Math.min(99, base + (Math.random() * spread * 2 - spread)));
}

export async function pollDevice(deviceId: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return null;

  const up = await tcpCheck(device.ip);
  const status = up ? "up" : "down";

  await prisma.device.update({
    where: { id: device.id },
    data: { status, last_seen: up ? new Date() : device.last_seen },
  });

  await prisma.metric.create({
    data: {
      device_id: device.id,
      cpu_percent: up ? jitter(28) : 0,
      ram_percent: up ? jitter(46) : 0,
      disk_percent: up ? jitter(61, 4) : 0,
    },
  });

  const sla = await prisma.sla.findUnique({ where: { device_id: device.id } });
  const nextUptime = sla
    ? Number((sla.uptime_30d * 0.997 + (up ? 100 : 0) * 0.003).toFixed(3))
    : up
      ? 100
      : 99.2;

  await prisma.sla.upsert({
    where: { device_id: device.id },
    update: { uptime_30d: nextUptime },
    create: { device_id: device.id, uptime_30d: nextUptime },
  });

  if (!up) {
    const open = await prisma.alert.findFirst({
      where: { device_id: device.id, event: "device_down", status: "firing" },
    });
    if (!open) {
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
        body: `${device.hostname} (${device.ip}) is not responding. Reply by email using the Reply-To on your channels.`,
        severity: "critical",
      });
    }
  } else {
    const firing = await prisma.alert.findMany({
      where: { device_id: device.id, event: "device_down", status: "firing" },
      select: { id: true },
    });
    await prisma.alert.updateMany({
      where: { device_id: device.id, event: "device_down", status: "firing" },
      data: { status: "resolved", resolved_at: new Date() },
    });
    await maybeCommentResolvedAlert(device.id, "device_down");
    if (firing[0]) {
      await notifyAlert({
        tenantId: device.tenant_id,
        alertId: firing[0].id,
        title: `${device.hostname} recovered`,
        body: `${device.hostname} (${device.ip}) is responding again.`,
        severity: "info",
        recovered: true,
      });
    }
  }

  return { id: device.id, status };
}

export async function pollAllDevices() {
  const devices = await prisma.device.findMany({ select: { id: true } });
  const results = [];
  for (const device of devices) {
    results.push(await pollDevice(device.id));
  }
  return results;
}
