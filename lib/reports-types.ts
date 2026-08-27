export const REPORT_ROW_CAP = 2000;

export const REPORT_TEMPLATES = [
  {
    id: "operations",
    label: "Operations",
    description: "Full NOC snapshot: devices, alerts, tickets, and period metrics.",
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Asset list with city, type, status, and rolling SLA.",
  },
  {
    id: "alerts",
    label: "Alerts",
    description: "Alert history for the selected period.",
  },
  {
    id: "tickets",
    label: "Tickets",
    description: "Helpdesk and remote tickets opened in range.",
  },
  {
    id: "sla",
    label: "SLA",
    description: "Uptime ranking and estate availability summary.",
  },
] as const;

export type ReportTemplateId = (typeof REPORT_TEMPLATES)[number]["id"];

export type ReportFilters = {
  city?: string;
  type?: string;
  status?: string;
  severity?: string;
};

export type ReportDeviceRow = {
  hostname: string;
  ip: string;
  type: string;
  city: string;
  location: string;
  status: string;
  sla: string;
  last_seen: string;
  cpu: string;
  ram: string;
  disk: string;
};

export type ReportAlertRow = {
  created_at: string;
  hostname: string;
  event: string;
  severity: string;
  status: string;
};

export type ReportTicketRow = {
  created_at: string;
  title: string;
  status: string;
  priority: string;
};

export type ReportPayload = {
  template: ReportTemplateId;
  template_label: string;
  filters: ReportFilters;
  tenant: string;
  from: string;
  to: string;
  generated_at: string;
  summary: {
    devices: number;
    up: number;
    down: number;
    degraded: number;
    alerts: number;
    firing: number;
    tickets: number;
    avg_sla: string;
  };
  devices: ReportDeviceRow[];
  alerts: ReportAlertRow[];
  tickets: ReportTicketRow[];
  truncated: { devices: boolean; alerts: boolean; tickets: boolean };
};

export type ReportMeta = {
  templates: typeof REPORT_TEMPLATES;
  cities: string[];
  types: string[];
  statuses: string[];
  severities: string[];
};

export function parseReportTemplate(value: string | null | undefined): ReportTemplateId {
  const id = (value ?? "operations").toLowerCase();
  if (REPORT_TEMPLATES.some((item) => item.id === id)) return id as ReportTemplateId;
  return "operations";
}

export function templateLabel(id: ReportTemplateId) {
  return REPORT_TEMPLATES.find((item) => item.id === id)?.label ?? "Operations";
}
