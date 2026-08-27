import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { resolveDeviceCity } from "@/lib/geo/indonesia-cities";
import {
  REPORT_ROW_CAP,
  REPORT_TEMPLATES,
  parseReportTemplate,
  templateLabel,
  type ReportFilters,
  type ReportMeta,
  type ReportPayload,
  type ReportTemplateId,
} from "@/lib/reports-types";

export type { ReportPayload, ReportFilters, ReportMeta, ReportTemplateId } from "@/lib/reports-types";
export { REPORT_ROW_CAP, REPORT_TEMPLATES, parseReportTemplate, templateLabel } from "@/lib/reports-types";

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

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const city = params.get("city")?.trim() || undefined;
  const type = params.get("type")?.trim() || undefined;
  const status = params.get("status")?.trim() || undefined;
  const severity = params.get("severity")?.trim() || undefined;
  return {
    city: city || undefined,
    type: type || undefined,
    status: status || undefined,
    severity: severity || undefined,
  };
}

function metricCell(value: number | null | undefined) {
  return value == null || Number.isNaN(value) ? "—" : `${value.toFixed(1)}%`;
}

function matchCity(deviceCity: string, filter?: string) {
  if (!filter) return true;
  const needle = filter.trim().toLowerCase();
  if (!needle || needle === "all") return true;
  return deviceCity.toLowerCase() === needle || deviceCity.toLowerCase().includes(needle);
}

export async function reportMeta(tenantId: string): Promise<ReportMeta> {
  const devices = await prisma.device.findMany({
    where: { tenant_id: tenantId },
    select: { type: true, status: true, city: true, location: true, hostname: true },
  });
  const cities = new Set<string>();
  const types = new Set<string>();
  const statuses = new Set<string>();
  for (const device of devices) {
    types.add(device.type);
    statuses.add(device.status);
    const city = resolveDeviceCity(device)?.name;
    if (city) cities.add(city);
  }
  return {
    templates: REPORT_TEMPLATES,
    cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
    types: Array.from(types).sort((a, b) => a.localeCompare(b)),
    statuses: Array.from(statuses).sort((a, b) => a.localeCompare(b)),
    severities: ["critical", "warning", "info"],
  };
}

export async function buildReport(
  tenantId: string,
  tenantSlug: string,
  from: Date,
  to: Date,
  options: { template?: ReportTemplateId; filters?: ReportFilters } = {},
): Promise<ReportPayload> {
  const template = options.template ?? "operations";
  const filters = options.filters ?? {};

  const deviceWhere: Record<string, unknown> = { tenant_id: tenantId };
  if (filters.type) deviceWhere.type = filters.type;
  if (filters.status) deviceWhere.status = filters.status;

  const alertWhere: Record<string, unknown> = {
    tenant_id: tenantId,
    created_at: { gte: from, lte: to },
  };
  if (filters.severity) alertWhere.severity = filters.severity;
  if (filters.type || filters.status) {
    alertWhere.device = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
  }

  const [devices, alerts, tickets, metricAvgs, alertCount, firingCount, ticketCount] = await Promise.all([
    prisma.device.findMany({
      where: deviceWhere,
      include: { sla: true },
      orderBy: { hostname: "asc" },
    }),
    prisma.alert.findMany({
      where: alertWhere,
      include: { device: { select: { hostname: true, type: true, status: true, city: true, location: true } } },
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
    prisma.alert.count({ where: alertWhere }),
    prisma.alert.count({ where: { ...alertWhere, status: "firing" } }),
    prisma.ticket.count({ where: { tenant_id: tenantId, created_at: { gte: from, lte: to } } }),
  ]);

  const metricsByDevice = new Map(metricAvgs.map((row) => [row.device_id, row._avg]));

  let deviceRows = devices.map((device) => {
    const avg = metricsByDevice.get(device.id);
    const city = resolveDeviceCity(device)?.name ?? "—";
    return {
      hostname: device.hostname,
      ip: device.ip,
      type: device.type,
      city,
      location: device.location ?? "—",
      status: device.status,
      sla: `${(device.sla?.uptime_30d ?? 100).toFixed(2)}%`,
      last_seen: device.last_seen ? stamp(device.last_seen) : "—",
      cpu: metricCell(avg?.cpu_percent),
      ram: metricCell(avg?.ram_percent),
      disk: metricCell(avg?.disk_percent),
      _slaNum: device.sla?.uptime_30d ?? 100,
    };
  });

  if (filters.city) {
    deviceRows = deviceRows.filter((row) => matchCity(row.city, filters.city));
  }

  let alertRows = alerts.map((alert) => {
    const city = resolveDeviceCity(alert.device)?.name ?? "—";
    return {
      created_at: stamp(alert.created_at),
      hostname: alert.device.hostname,
      event: alert.event,
      severity: alert.severity,
      status: alert.status,
      city,
    };
  });
  if (filters.city) {
    alertRows = alertRows.filter((row) => matchCity(row.city, filters.city));
  }

  const devicesTruncated = deviceRows.length > REPORT_ROW_CAP;
  const alertsTruncated = alertRows.length > REPORT_ROW_CAP || alerts.length > REPORT_ROW_CAP;
  const ticketsTruncated = tickets.length > REPORT_ROW_CAP;

  deviceRows = deviceRows.slice(0, REPORT_ROW_CAP);
  alertRows = alertRows.slice(0, REPORT_ROW_CAP);
  const ticketRows = tickets.slice(0, REPORT_ROW_CAP).map((ticket) => ({
    created_at: stamp(ticket.created_at),
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
  }));

  if (template === "sla") {
    deviceRows = [...deviceRows].sort((a, b) => a._slaNum - b._slaNum);
  }

  const scopedDevices = deviceRows;
  const slaValues = scopedDevices.map((d) => d._slaNum);
  const avgSla = slaValues.length ? slaValues.reduce((a, b) => a + b, 0) / slaValues.length : 100;

  const includeDevices = template === "operations" || template === "inventory" || template === "sla";
  const includeAlerts = template === "operations" || template === "alerts";
  const includeTickets = template === "operations" || template === "tickets";

  return {
    template,
    template_label: templateLabel(template),
    filters,
    tenant: tenantSlug,
    from: from.toISOString(),
    to: to.toISOString(),
    generated_at: new Date().toISOString(),
    summary: {
      devices: scopedDevices.length,
      up: scopedDevices.filter((d) => d.status === "up").length,
      down: scopedDevices.filter((d) => d.status === "down").length,
      degraded: scopedDevices.filter((d) => d.status === "degraded").length,
      alerts: includeAlerts ? (filters.city ? alertRows.length : alertCount) : 0,
      firing: includeAlerts
        ? filters.city
          ? alertRows.filter((a) => a.status === "firing").length
          : firingCount
        : 0,
      tickets: includeTickets ? ticketCount : 0,
      avg_sla: `${avgSla.toFixed(2)}%`,
    },
    devices: includeDevices
      ? scopedDevices.map(({ _slaNum: _drop, ...row }) => row)
      : [],
    alerts: includeAlerts
      ? alertRows.map(({ city: _c, ...row }) => row)
      : [],
    tickets: includeTickets ? ticketRows : [],
    truncated: {
      devices: includeDevices && devicesTruncated,
      alerts: includeAlerts && alertsTruncated,
      tickets: includeTickets && ticketsTruncated,
    },
  };
}

export function reportFilename(payload: ReportPayload, ext: "pdf" | "xlsx" | "csv") {
  return `netmon-${payload.template}-${payload.tenant}-${ymd(new Date(payload.from))}_${ymd(new Date(payload.to))}.${ext}`;
}

function filterHint(payload: ReportPayload) {
  const parts: string[] = [];
  if (payload.filters.city) parts.push(`city=${payload.filters.city}`);
  if (payload.filters.type) parts.push(`type=${payload.filters.type}`);
  if (payload.filters.status) parts.push(`status=${payload.filters.status}`);
  if (payload.filters.severity) parts.push(`severity=${payload.filters.severity}`);
  return parts.length ? parts.join(", ") : "none";
}

export function reportPdf(payload: ReportPayload) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`NETMON · ${payload.template_label} report`, 14, 18);
  doc.setFontSize(10);
  doc.text(`Tenant: ${payload.tenant}`, 14, 26);
  doc.text(`Period: ${stamp(new Date(payload.from))} → ${stamp(new Date(payload.to))} UTC`, 14, 32);
  doc.text(`Generated: ${stamp(new Date(payload.generated_at))} UTC`, 14, 38);
  doc.text(`Filters: ${filterHint(payload)}`, 14, 44);

  autoTable(doc, {
    startY: 50,
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

  let cursor = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (payload.devices.length) {
    autoTable(doc, {
      startY: cursor,
      head: [["Hostname", "IP", "Type", "City", "Status", "SLA", "CPU", "RAM"]],
      body: payload.devices.map((d) => [d.hostname, d.ip, d.type, d.city, d.status, d.sla, d.cpu, d.ram]),
      styles: { fontSize: 8 },
    });
    cursor = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (payload.alerts.length || payload.template === "alerts") {
    autoTable(doc, {
      startY: cursor,
      head: [["Time UTC", "Device", "Event", "Severity", "Status"]],
      body: payload.alerts.length
        ? payload.alerts.map((a) => [a.created_at, a.hostname, a.event, a.severity, a.status])
        : [["—", "No alerts in this period", "", "", ""]],
      styles: { fontSize: 8 },
    });
    cursor = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (payload.tickets.length || payload.template === "tickets") {
    autoTable(doc, {
      startY: cursor,
      head: [["Time UTC", "Title", "Status", "Priority"]],
      body: payload.tickets.length
        ? payload.tickets.map((t) => [t.created_at, t.title, t.status, t.priority])
        : [["—", "No tickets in this period", "", ""]],
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
      [`NETMON ${payload.template_label} report`],
      ["Tenant", payload.tenant],
      ["Template", payload.template],
      ["From UTC", stamp(new Date(payload.from))],
      ["To UTC", stamp(new Date(payload.to))],
      ["Generated UTC", stamp(new Date(payload.generated_at))],
      ["Filters", filterHint(payload)],
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
  if (payload.devices.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.devices), "Devices");
  }
  if (payload.alerts.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.alerts), "Alerts");
  }
  if (payload.tickets.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(payload.tickets), "Tickets");
  }
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function sheetToCsv(headers: string[], rows: Array<Array<string | number>>) {
  return [headers.map(csvEscape).join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
}

export function reportCsv(payload: ReportPayload) {
  const chunks: string[] = [
    `# NETMON ${payload.template_label} report`,
    `# tenant=${payload.tenant}`,
    `# from=${stamp(new Date(payload.from))} UTC`,
    `# to=${stamp(new Date(payload.to))} UTC`,
    `# filters=${filterHint(payload)}`,
    "",
  ];

  if (payload.devices.length) {
    chunks.push(
      sheetToCsv(
        ["hostname", "ip", "type", "city", "location", "status", "sla", "last_seen", "cpu", "ram", "disk"],
        payload.devices.map((d) => [
          d.hostname,
          d.ip,
          d.type,
          d.city,
          d.location,
          d.status,
          d.sla,
          d.last_seen,
          d.cpu,
          d.ram,
          d.disk,
        ]),
      ),
    );
    chunks.push("");
  }

  if (payload.alerts.length) {
    chunks.push(
      sheetToCsv(
        ["created_at", "hostname", "event", "severity", "status"],
        payload.alerts.map((a) => [a.created_at, a.hostname, a.event, a.severity, a.status]),
      ),
    );
    chunks.push("");
  }

  if (payload.tickets.length) {
    chunks.push(
      sheetToCsv(
        ["created_at", "title", "status", "priority"],
        payload.tickets.map((t) => [t.created_at, t.title, t.status, t.priority]),
      ),
    );
  }

  if (!payload.devices.length && !payload.alerts.length && !payload.tickets.length) {
    chunks.push("metric,value");
    chunks.push(`devices,${payload.summary.devices}`);
    chunks.push(`alerts,${payload.summary.alerts}`);
    chunks.push(`tickets,${payload.summary.tickets}`);
    chunks.push(`avg_sla,${payload.summary.avg_sla}`);
  }

  return chunks.join("\n");
}
