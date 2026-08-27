"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { ALERT_EVENTS } from "@/lib/alert-events";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  event: string;
  severity: string;
  device_id: string | null;
  device_type: string | null;
  config: Record<string, unknown>;
  for_seconds: number;
  device?: { id: string; hostname: string } | null;
};

type DeviceOption = { id: string; hostname: string; type: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function thresholdHint(event: string, config: Record<string, unknown>) {
  if (event === "high_latency") return `≥ ${Number(config.ms ?? 500)} ms`;
  if (event.startsWith("metric_")) return `≥ ${Number(config.percent ?? 90)}%`;
  if (event === "snmp_threshold") {
    return `${String(config.oid_key ?? "?")} ${String(config.op ?? ">")} ${Number(config.value ?? 0)}`;
  }
  return "—";
}

export function AlertRulesManager({ canWrite }: { canWrite: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [name, setName] = useState("");
  const [event, setEvent] = useState<(typeof ALERT_EVENTS)[number]>("high_latency");
  const [severity, setSeverity] = useState("warning");
  const [deviceId, setDeviceId] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [threshold, setThreshold] = useState("500");
  const [oidKey, setOidKey] = useState("ifOperStatus");
  const [forSeconds, setForSeconds] = useState("0");

  async function load() {
    const [rulesRes, devicesRes] = await Promise.all([fetch("/api/alert-rules"), fetch("/api/devices")]);
    if (rulesRes.ok) setRules(await rulesRes.json());
    if (devicesRes.ok) {
      const rows = (await devicesRes.json()) as DeviceOption[];
      setDevices(rows.map((d) => ({ id: d.id, hostname: d.hostname, type: d.type })));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function buildConfig() {
    if (event === "high_latency") return { ms: Number(threshold) || 500 };
    if (event.startsWith("metric_")) return { percent: Number(threshold) || 90 };
    if (event === "snmp_threshold") {
      return { oid_key: oidKey.trim() || "value", op: ">", value: Number(threshold) || 0 };
    }
    return {};
  }

  async function createRule() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const res = await fetch("/api/alert-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        event,
        severity,
        device_id: deviceId || null,
        device_type: deviceType || null,
        config: buildConfig(),
        for_seconds: Number(forSeconds) || 0,
      }),
    });
    if (!res.ok) {
      toast.error("Could not create rule");
      return;
    }
    setName("");
    toast.success("Rule created");
    await load();
  }

  async function toggle(rule: Rule) {
    const res = await fetch(`/api/alert-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    if (!res.ok) {
      toast.error("Could not update rule");
      return;
    }
    await load();
  }

  async function remove(rule: Rule) {
    if (!confirm(`Delete rule “${rule.name}”?`)) return;
    const res = await fetch(`/api/alert-rules/${rule.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete rule");
      return;
    }
    toast.success("Rule deleted");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alert rules</h1>
        <p className="text-sm text-muted-foreground">
          Threshold and status conditions that open alerts. Default “Device down” keeps P2 behaviour.
        </p>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New rule</CardTitle>
            <CardDescription>Scope by device or type; leave both empty for all devices.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Name
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="High latency edge" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Event
              <select className={selectClass} value={event} onChange={(e) => setEvent(e.target.value as typeof event)}>
                {ALERT_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Severity
              <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Device (optional)
              <select className={selectClass} value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
                <option value="">All devices</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.hostname}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Type filter (optional)
              <Input value={deviceType} onChange={(e) => setDeviceType(e.target.value)} placeholder="switch / application" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Threshold (ms, %, or SNMP value)
              <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </label>
            {event === "snmp_threshold" && (
              <label className="space-y-1 text-xs text-muted-foreground">
                SNMP oid_key
                <Input value={oidKey} onChange={(e) => setOidKey(e.target.value)} placeholder="ifOperStatus" />
              </label>
            )}
            <label className="space-y-1 text-xs text-muted-foreground">
              For seconds (anti-flap)
              <Input value={forSeconds} onChange={(e) => setForSeconds(e.target.value)} />
            </label>
            <div className="flex items-end">
              <Button type="button" onClick={() => void createRule()}>
                Add rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{rules.length} rules</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Scope</th>
                <th className="px-5 py-3">Threshold</th>
                <th className="px-5 py-3">For</th>
                <th className="px-5 py-3">Enabled</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-border/70">
                  <td className="px-5 py-3 font-medium">{rule.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{rule.event}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={rule.severity} />
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {rule.device?.hostname || rule.device_type || "all"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{thresholdHint(rule.event, rule.config ?? {})}</td>
                  <td className="px-5 py-3 font-mono text-xs">{rule.for_seconds}s</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={rule.enabled ? "up" : "down"} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canWrite && (
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void toggle(rule)}>
                          {rule.enabled ? "Disable" : "Enable"}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void remove(rule)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={8}>
                    No rules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
