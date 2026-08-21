export const REPORT_ROW_CAP = 2000;

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
  truncated: { alerts: boolean; tickets: boolean };
};
