"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

type WindowRow = {
  id: string;
  name: string;
  scope: string;
  scope_config: { device_ids?: string[]; types?: string[] };
  starts_at: string;
  ends_at: string;
  suppress_alert: boolean;
  suppress_notify: boolean;
  suppress_ticket: boolean;
  note: string | null;
};

type DeviceOption = { id: string; hostname: string; type: string };

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(localValue: string) {
  return new Date(localValue).toISOString();
}

export function MaintenanceManager({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<WindowRow[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"all" | "devices" | "types">("all");
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [types, setTypes] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [suppressAlert, setSuppressAlert] = useState(true);
  const [suppressNotify, setSuppressNotify] = useState(true);
  const [suppressTicket, setSuppressTicket] = useState(true);
  const [note, setNote] = useState("");

  const activeCount = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => new Date(r.starts_at).getTime() <= now && new Date(r.ends_at).getTime() > now).length;
  }, [rows]);

  async function load() {
    const [winRes, devicesRes] = await Promise.all([fetch("/api/maintenance"), fetch("/api/devices")]);
    if (winRes.ok) setRows(await winRes.json());
    if (devicesRes.ok) {
      const list = (await devicesRes.json()) as DeviceOption[];
      setDevices(list.map((d) => ({ id: d.id, hostname: d.hostname, type: d.type })));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createWindow() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const scope_config =
      scope === "devices"
        ? { device_ids: deviceIds }
        : scope === "types"
          ? { types: types.split(",").map((t) => t.trim()).filter(Boolean) }
          : {};

    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        scope,
        scope_config,
        starts_at: toIso(startsAt),
        ends_at: toIso(endsAt),
        suppress_alert: suppressAlert,
        suppress_notify: suppressNotify,
        suppress_ticket: suppressTicket,
        note: note.trim() || null,
      }),
    });
    if (!res.ok) {
      toast.error("Could not create window");
      return;
    }
    setName("");
    setNote("");
    toast.success("Maintenance window created");
    await load();
  }

  async function remove(row: WindowRow) {
    if (!confirm(`Delete “${row.name}”?`)) return;
    const res = await fetch(`/api/maintenance/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete");
      return;
    }
    toast.success("Deleted");
    await load();
  }

  function windowStatus(row: WindowRow) {
    const now = Date.now();
    const start = new Date(row.starts_at).getTime();
    const end = new Date(row.ends_at).getTime();
    if (now < start) return "unknown";
    if (now >= end) return "resolved";
    return "firing";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          Suppress alerts, notifications, and auto-tickets while work is scheduled. Device status is unchanged.
        </p>
        {activeCount > 0 && (
          <p className="mt-2 text-sm text-primary">
            {activeCount} window{activeCount === 1 ? "" : "s"} active now
          </p>
        )}
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New window</CardTitle>
            <CardDescription>Choose scope and what to suppress.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Name
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Core switch upgrade" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Scope
              <select
                className={selectClass}
                value={scope}
                onChange={(e) => setScope(e.target.value as typeof scope)}
              >
                <option value="all">All devices</option>
                <option value="devices">Selected devices</option>
                <option value="types">Device types</option>
              </select>
            </label>
            {scope === "devices" && (
              <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
                Devices
                <select
                  className={`${selectClass} h-28`}
                  multiple
                  value={deviceIds}
                  onChange={(e) => setDeviceIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.hostname} · {d.type}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scope === "types" && (
              <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
                Types (comma-separated)
                <Input value={types} onChange={(e) => setTypes(e.target.value)} placeholder="switch, firewall" />
              </label>
            )}
            <label className="space-y-1 text-xs text-muted-foreground">
              Starts
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Ends
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={suppressAlert} onChange={(e) => setSuppressAlert(e.target.checked)} />
              Suppress alert create
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={suppressNotify} onChange={(e) => setSuppressNotify(e.target.checked)} />
              Suppress notify
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={suppressTicket} onChange={(e) => setSuppressTicket(e.target.checked)} />
              Suppress auto-ticket
            </label>
            <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
              Note
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </label>
            <div>
              <Button type="button" onClick={() => void createWindow()}>
                Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{rows.length} windows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-3"
            >
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {row.scope}
                  {row.scope === "types" && row.scope_config?.types
                    ? ` · ${(row.scope_config.types || []).join(",")}`
                    : ""}
                  {row.scope === "devices" && row.scope_config?.device_ids
                    ? ` · ${row.scope_config.device_ids.length} devices`
                    : ""}
                  {" · "}
                  {new Date(row.starts_at).toLocaleString()} → {new Date(row.ends_at).toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  suppress:{" "}
                  {[
                    row.suppress_alert ? "alert" : null,
                    row.suppress_notify ? "notify" : null,
                    row.suppress_ticket ? "ticket" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "none"}
                  {row.note ? ` · ${row.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={windowStatus(row)} />
                {canWrite && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void remove(row)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No maintenance windows.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
