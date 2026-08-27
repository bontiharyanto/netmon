export const ALERT_EVENTS = [
  "device_down",
  "check_degraded",
  "high_latency",
  "metric_cpu",
  "metric_ram",
  "metric_disk",
] as const;

export type AlertEvent = (typeof ALERT_EVENTS)[number];
