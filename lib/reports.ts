import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { resolveDeviceCity } from "@/lib/geo/indonesia-cities";
import { REPORT_ROW_CAP, type ReportPayload } from "@/lib/reports-types";

export type { ReportPayload } from "@/lib/reports-types";
export { REPORT_ROW_CAP } from "@/lib/reports-types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ymd(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function stamp(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function parseBound(value: string | null, fallback: Date, endOfDay: boolean) {
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function parseReportRange(fromRaw: string | null, toRaw: string | null) {
  const now = new Date();
  let to = parseBound(toRaw, now, true);
  if (to.getTime() > now.getTime() + 60_000) to = now;
  let from = parseBound(fromRaw, new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000), false);
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  const maxMs = 366 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxMs) {
    from = new Date(to.getTime() - maxMs);
  }
  return { from, to };
}

function metricCell(value: number | null | undefined) {
  return value == null || Number.isNaN(value) ? "—" : `${value.toFixed(1)}%`;
}

export async function buildReport(tenantId: string, tenantSlug: string, from: Date, to: Date): Promise<ReportPayload> {
  const [devices, alerts, tickets, metricAvgs, alertCount, firingCount, ticketCount] = await Promise.all([
    prisma.device.findMany({
      where: { tenant_id: tenantId },
      include: { sla: true },
      orderBy: { hostname: "asc" },
    }),
    prisma.alert.findMany({
      where: { tenant_id: tenantId, created_at: { gte: from, lte: to } },
      include: { device: { select: { hostname: true } } },
      orderBy: { created_at: "desc" },
      take: REPORT_ROW_CAP + 1,
    }),
    prisma.ticket.findMany({
      where: { tenant_id: tenantId, created_at: { gte: from, lte: to } },
      orderBy: { created_at: "desc" },
      take: REPORT_ROW_CAP + 1,
    }),
    prisma.metric.groupBy({
      by: ["device_id"],
      where: { ts: { gte: from, lte: to }, device: { tenant_id: tenantId } },
      _avg: { cpu_percent: true, ram_percent: true, disk_percent: true },
    }),
    prisma.alert.count({ where: { tenant_id: tenantId, created_at: { gte: from, lte: to } } }),
    prisma.alert.count({ where: { tenant_id: tenantId, created_at: { gte: from, lte: to }, status: "firing" } }),
    prisma.ticket.count({ where: { tenant_id: tenantId, created_at: { gte: from, lte: to } } }),
  ]);

  const metricsByDevice = new Map(metricAvgs.map((row) => [row.device_id, row._avg]));
  const slaValues = devices.map((d) => d.sla?.uptime_30d ?? 100);
  const avgSla = slaValues.length ? slaValues.reduce((a, b) => a + b, 0) / slaValues.length : 100;
  const alertRows = alerts.slice(0, REPORT_ROW_CAP);
  const ticketRows = tickets.slice(0, REPORT_ROW_CAP);

  return {
    tenant: tenantSlug,
    from: from.toISOString(),
    to: to.toISOString(),
    generated_at: new Date().toISOString(),
    summary: {
      devices: devices.length,
      up: devices.filter((d) => d.status === "up").length,
      down: devices.filter((d) => d.status === "down").length,
      degraded: devices.filter((d) => d.status === "degraded").length,
      alerts: alertCount,
      firing: firingCount,
      tickets: ticketCount,
      avg_sla: `${avgSla.toFixed(2)}%`,
    },
    devices: devices.map((device) => {
      const avg = metricsByDevice.get(device.id);
      return {
        hostname: device.hostname,
        ip: device.ip,
        type: device.type,
        city: resolveDeviceCity(device)?.name ?? "—",
        location: device.location ?? "—",
        status: device.status,
        sla: `${(device.sla?.uptime_30d ?? 100).toFixed(2)}%`,
        last_seen: device.last_seen ? stamp(device.last_seen) : "—",
        cpu: metricCell(avg?.cpu_percent),
        ram: metricCell(avg?.ram_percent),
        disk: metricCell(avg?.disk_percent),
      };
    }),
    alerts: alertRows.map((alert) => ({
      created_at: stamp(alert.created_at),
      hostname: alert.device.hostname,
      event: alert.event,
      severity: alert.severity,
      status: alert.status,
    })),
    tickets: ticketRows.map((ticket) => ({
      created_at: stamp(ticket.created_at),
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
    })),
    truncated: {
      alerts: alerts.length > REPORT_ROW_CAP,
      tickets: tickets.length > REPORT_ROW_CAP,
    },
  };
}

export function reportFilename(payload: ReportPayload, ext: "pdf" | "xlsx") {
  return `netmon-report-${payload.tenant}-${ymd(new Date(payload.from))}_${ymd(new Date(payload.to))}.${ext}`;
}

export function reportPdf(payload: ReportPayload) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("NETMON operations report", 14, 18);
  doc.setFontSize(10);
  doc.text(`Tenant: ${payload.tenant}`, 14, 26);
  doc.text(`Period: ${stamp(new Date(payload.from))} → ${stamp(new Date(payload.to))} UTC`, 14, 32);
  doc.text(`Generated: ${stamp(new Date(payload.generated_at))} UTC`, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [["Metric", "Value"]],
    body: [
      ["Devices", String(payload.summary.devices)],
      ["Up / degraded / down", `${payload.summary.up} / ${payload.summary.degraded} / ${payload.summary.down}`],
      ["Alerts in period", String(payload.summary.alerts)],
      ["Firing", String(payload.summary.firing)],
      ["Tickets in period", String(payload.summary.tickets)],
      ["Avg SLA 30d", payload.summary.avg_sla],
    ],
  });

  const afterSummary = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: afterSummary,
    head: [["Hostname", "IP", "Type", "City", "Status", "SLA", "CPU", "RAM"]],
    body: payload.devices.map((d) => [d.hostname, d.ip, d.type, d.city, d.status, d.sla, d.cpu, d.ram]),
    styles: { fontSize: 8 },
  });

  const afterDevices = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: afterDevices,
    head: [["Time UTC", "Device", "Event", "Severity", "Status"]],
    body: payload.alerts.length
      ? payload.alerts.map((a) => [a.created_at, a.hostname, a.event, a.severity, a.status])
      : [["—", "No alerts in this period", "", "", ""]],
    styles: { fontSize: 8 },
  });

  if (payload.tickets.length) {
    const afterAlerts = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: afterAlerts,
      head: [["Time UTC", "Title", "Status", "Priority"]],
      body: payload.tickets.map((t) => [t.created_at, t.title, t.status, t.priority]),
      styles: { fontSize: 8 },
    });
  }

  return doc.output("arraybuffer");
}

export function reportXlsx(payload: ReportPayload) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["NETMON operations report"],
      ["Tenant", payload.tenant],
      ["From UTC", stamp(new Date(payload.from))],
      ["To UTC", stamp(new Date(payload.to))],
      ["Generated UTC", stamp(new Date(payload.generated_at))],
      [],
      ["Metric", "Value"],
      ["Devices", payload.summary.devices],
      ["Up", payload.summary.up],
      ["Degraded", payload.summary.degraded],
      ["Down", payload.summary.down],
      ["Alerts in period", payload.summary.alerts],
      ["Firing", payload.summary.firing],
      ["Tickets in period", payload.summary.tickets],
      ["Avg SLA 30d", payload.summary.avg_sla],
    ]),
    "Summary",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.devices), "Devices");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.alerts), "Alerts");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.tickets), "Tickets");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
