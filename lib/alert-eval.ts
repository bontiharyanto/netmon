import { prisma } from "@/lib/prisma";
import { maybeCommentResolvedAlert, maybeOpenTicketsForAlert } from "@/lib/tickets";
import { notifyAlert } from "@/lib/notify";
import { ALERT_EVENTS, type AlertEvent } from "@/lib/alert-events";

export { ALERT_EVENTS, type AlertEvent };

export type MaintenanceHit = {
  id: string;
  name: string;
  suppress_alert: boolean;
  suppress_notify: boolean;
  suppress_ticket: boolean;
};

type RuleRow = {
  id: string;
  name: string;
  event: string;
  severity: string;
  device_id: string | null;
  device_type: string | null;
  config: unknown;
  for_seconds: number;
};

type DeviceCtx = {
  id: string;
  tenant_id: string;
  hostname: string;
  ip: string;
  type: string;
  status: string;
  last_check_latency_ms: number | null;
  last_sensor_value?: number | null;
  sensor_kind?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function ensureDefaultDeviceDownRule(tenantId: string) {
  const existing = await prisma.alert_rule.findFirst({
    where: { tenant_id: tenantId, event: "device_down" },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.alert_rule.create({
    data: {
      tenant_id: tenantId,
      name: "Device down",
      event: "device_down",
      severity: "critical",
      enabled: true,
      config: {},
      for_seconds: 0,
    },
  });
}

export async function ensureDefaultRulesForAllTenants() {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const tenant of tenants) {
    await ensureDefaultDeviceDownRule(tenant.id);
  }
}

function scopeCoversDevice(
  scope: string,
  scopeConfig: unknown,
  device: { id: string; type: string },
): boolean {
  if (scope === "all") return true;
  const cfg = asRecord(scopeConfig);
  if (scope === "devices") {
    const ids = Array.isArray(cfg.device_ids) ? cfg.device_ids.map(String) : [];
    return ids.includes(device.id);
  }
  if (scope === "types") {
    const types = Array.isArray(cfg.types) ? cfg.types.map(String) : [];
    return types.includes(device.type);
  }
  return false;
}

export async function findActiveMaintenance(
  tenantId: string,
  device: { id: string; type: string },
  at = new Date(),
): Promise<MaintenanceHit | null> {
  const windows = await prisma.maintenance_window.findMany({
    where: {
      tenant_id: tenantId,
      starts_at: { lte: at },
      ends_at: { gt: at },
    },
    orderBy: { starts_at: "desc" },
  });
  for (const window of windows) {
    if (scopeCoversDevice(window.scope, window.scope_config, device)) {
      return {
        id: window.id,
        name: window.name,
        suppress_alert: window.suppress_alert,
        suppress_notify: window.suppress_notify,
        suppress_ticket: window.suppress_ticket,
      };
    }
  }
  return null;
}

function ruleMatchesDevice(rule: RuleRow, device: DeviceCtx) {
  if (rule.device_id && rule.device_id !== device.id) return false;
  if (rule.device_type && rule.device_type !== device.type) return false;
  return true;
}

type MetricCtx = {
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
  metric_extra?: Record<string, number> | null;
};

function conditionMet(
  rule: RuleRow,
  device: DeviceCtx,
  metric: MetricCtx | null,
): { ok: boolean; message: string } {
  const cfg = asRecord(rule.config);
  switch (rule.event) {
    case "device_down":
      return {
        ok: device.status === "down",
        message: `${device.hostname} is down`,
      };
    case "check_degraded":
      return {
        ok: device.status === "degraded",
        message: `${device.hostname} is degraded`,
      };
    case "high_latency": {
      const ms = Number(cfg.ms ?? 500);
      const latency = device.last_check_latency_ms;
      return {
        ok: latency != null && latency >= ms,
        message: `latency ${latency ?? "—"} ms ≥ ${ms} ms`,
      };
    }
    case "metric_cpu": {
      const percent = Number(cfg.percent ?? 90);
      const value = metric?.cpu_percent;
      return {
        ok: value != null && value >= percent,
        message: `CPU ${value?.toFixed(1) ?? "—"}% ≥ ${percent}%`,
      };
    }
    case "metric_ram": {
      const percent = Number(cfg.percent ?? 90);
      const value = metric?.ram_percent;
      return {
        ok: value != null && value >= percent,
        message: `RAM ${value?.toFixed(1) ?? "—"}% ≥ ${percent}%`,
      };
    }
    case "metric_disk": {
      const percent = Number(cfg.percent ?? 90);
      const value = metric?.disk_percent;
      return {
        ok: value != null && value >= percent,
        message: `Disk ${value?.toFixed(1) ?? "—"}% ≥ ${percent}%`,
      };
    }
    case "snmp_threshold": {
      const key = String(cfg.oid_key ?? "");
      const op = String(cfg.op ?? ">");
      const threshold = Number(cfg.value ?? 0);
      const value = metric?.metric_extra?.[key];
      if (value == null || !key) return { ok: false, message: "" };
      const ok =
        op === ">="
          ? value >= threshold
          : op === "<"
            ? value < threshold
            : op === "<="
              ? value <= threshold
              : op === "=="
                ? value === threshold
                : value > threshold;
      return { ok, message: `SNMP ${key}=${value} ${op} ${threshold}` };
    }
    case "sensor_threshold": {
      const threshold = Number(cfg.value ?? 28);
      const op = String(cfg.op ?? ">");
      const value = device.last_sensor_value;
      if (value == null) return { ok: false, message: "" };
      const ok =
        op === ">="
          ? value >= threshold
          : op === "<"
            ? value < threshold
            : op === "<="
              ? value <= threshold
              : op === "=="
                ? value === threshold
                : value > threshold;
      return {
        ok,
        message: `sensor ${device.sensor_kind || "reading"}=${value} ${op} ${threshold}`,
      };
    }
    default:
      return { ok: false, message: "" };
  }
}

async function clearRuleState(ruleId: string, deviceId: string) {
  await prisma.alert_rule_state.deleteMany({ where: { rule_id: ruleId, device_id: deviceId } });
}

async function sustainedLongEnough(rule: RuleRow, tenantId: string, deviceId: string, now: Date) {
  if (rule.for_seconds <= 0) return true;
  const existing = await prisma.alert_rule_state.findUnique({
    where: { rule_id_device_id: { rule_id: rule.id, device_id: deviceId } },
  });
  if (!existing) {
    await prisma.alert_rule_state.create({
      data: { tenant_id: tenantId, rule_id: rule.id, device_id: deviceId, since: now },
    });
    return false;
  }
  const elapsed = (now.getTime() - existing.since.getTime()) / 1000;
  return elapsed >= rule.for_seconds;
}

async function resolveEvent(
  device: DeviceCtx,
  event: string,
  recoveredNote: string,
) {
  const firing = await prisma.alert.findMany({
    where: { device_id: device.id, event, status: "firing" },
    select: { id: true },
  });
  if (!firing.length) return;
  await prisma.alert.updateMany({
    where: { device_id: device.id, event, status: "firing" },
    data: { status: "resolved", resolved_at: new Date() },
  });
  await maybeCommentResolvedAlert(device.id, event);
  await notifyAlert({
    tenantId: device.tenant_id,
    alertId: firing[0]!.id,
    title: `${device.hostname} recovered`,
    body: `${device.hostname} (${device.ip}) — ${recoveredNote}`,
    severity: "info",
    recovered: true,
  });
}

async function fireRule(
  rule: RuleRow,
  device: DeviceCtx,
  message: string,
  maintenance: MaintenanceHit | null,
) {
  const open = await prisma.alert.findFirst({
    where: { device_id: device.id, event: rule.event, status: "firing" },
  });
  if (open) return;

  if (maintenance?.suppress_alert) return;

  const alert = await prisma.alert.create({
    data: {
      tenant_id: device.tenant_id,
      device_id: device.id,
      event: rule.event,
      status: "firing",
      severity: rule.severity,
      message,
      rule_id: rule.id || null,
    },
  });

  if (!maintenance?.suppress_ticket) {
    await maybeOpenTicketsForAlert(alert.id);
  }
  if (!maintenance?.suppress_notify) {
    await notifyAlert({
      tenantId: device.tenant_id,
      alertId: alert.id,
      title: `${rule.severity.toUpperCase()} ${device.hostname} · ${rule.event}`,
      body: `${device.hostname} (${device.ip}) — ${message}`,
      severity: rule.severity,
    });
  }
}

/**
 * Evaluate enabled alert rules for one device after a poll cycle.
 * Falls back to legacy device_down behaviour if no matching rule exists.
 */
export async function evaluateDeviceAlerts(
  device: DeviceCtx,
  metric: MetricCtx | null,
) {
  await ensureDefaultDeviceDownRule(device.tenant_id);

  const rules = await prisma.alert_rule.findMany({
    where: { tenant_id: device.tenant_id, enabled: true },
    orderBy: { created_at: "asc" },
  });

  const maintenance = await findActiveMaintenance(device.tenant_id, device);
  const now = new Date();
  const eventsSeen = new Set(rules.map((r) => r.event));
  const activeEvents = new Set<string>();

  for (const rule of rules) {
    if (!ruleMatchesDevice(rule, device)) continue;
    const hit = conditionMet(rule, device, metric);
    if (!hit.ok) {
      await clearRuleState(rule.id, device.id);
      continue;
    }
    activeEvents.add(rule.event);
    const ready = await sustainedLongEnough(rule, device.tenant_id, device.id, now);
    if (!ready) continue;
    await fireRule(rule, device, hit.message, maintenance);
  }

  for (const event of Array.from(eventsSeen)) {
    if (!activeEvents.has(event)) {
      await resolveEvent(device, event, `${event} cleared`);
    }
  }

  // Legacy parity: if somehow no device_down rule, keep P2 behaviour
  if (!eventsSeen.has("device_down")) {
    if (device.status === "down") {
      await fireRule(
        {
          id: "",
          name: "Device down",
          event: "device_down",
          severity: "critical",
          device_id: null,
          device_type: null,
          config: {},
          for_seconds: 0,
        },
        device,
        `${device.hostname} is down`,
        maintenance,
      );
    } else {
      await resolveEvent(device, "device_down", "device responding again");
    }
  }
}
