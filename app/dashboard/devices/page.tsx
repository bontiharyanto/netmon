"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { INDONESIA_CITIES, resolveDeviceCity } from "@/lib/geo/indonesia-cities";
import {
  DEVICE_TYPES,
  defaultChecksForType,
  formatChecksSummary,
  parseDeviceChecks,
  parseTcpPortsInput,
  type DeviceChecks,
} from "@/lib/device-checks";

type Device = {
  id: string;
  hostname: string;
  ip: string;
  type: string;
  status: string;
  location?: string | null;
  city?: string | null;
  checks?: unknown;
  display_name?: string | null;
  skip_poller_when_agent?: boolean;
  last_check_latency_ms?: number | null;
  last_check_at?: string | null;
  snmp_enabled?: boolean;
  snmp_version?: string | null;
  snmp_community?: string | null;
  snmp_community_set?: boolean;
  snmp_port?: number;
  snmp_profile_id?: string | null;
  snmp_last_error?: string | null;
  sensor_kind?: string | null;
  sensor_json_path?: string | null;
  last_sensor_value?: number | null;
  last_sensor_unit?: string | null;
};

type SnmpProfile = { id: string; name: string; system?: boolean };

function CitySelect({
  name,
  value,
  onChange,
  className,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <select
      name={name}
      {...(onChange
        ? { value: value ?? "", onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) }
        : { defaultValue: "" })}
      className={
        className ??
        "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      }
    >
      <option value="">City (Indonesia)</option>
      {INDONESIA_CITIES.map((city) => (
        <option key={city.slug} value={city.slug}>
          {city.name}
        </option>
      ))}
    </select>
  );
}

const selectClass = "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [type, setType] = useState("server");
  const [tcpPorts, setTcpPorts] = useState("80,443");
  const [httpUrl, setHttpUrl] = useState("");
  const [icmp, setIcmp] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTcp, setEditTcp] = useState("");
  const [editHttp, setEditHttp] = useState("");
  const [editIcmp, setEditIcmp] = useState(false);
  const [editSkipAgent, setEditSkipAgent] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ id: string; ts: string; status: string; latency_ms: number | null; detail: unknown }>
  >([]);
  const [snmpId, setSnmpId] = useState<string | null>(null);
  const [snmpEnabled, setSnmpEnabled] = useState(false);
  const [snmpVersion, setSnmpVersion] = useState("v2c");
  const [snmpCommunity, setSnmpCommunity] = useState("");
  const [snmpPort, setSnmpPort] = useState("161");
  const [snmpProfileId, setSnmpProfileId] = useState("");
  const [profiles, setProfiles] = useState<SnmpProfile[]>([]);
  const [sensorKind, setSensorKind] = useState("temperature");
  const [sensorPath, setSensorPath] = useState("temp_c");
  const [sensorId, setSensorId] = useState<string | null>(null);
  const [editSensorKind, setEditSensorKind] = useState("temperature");
  const [editSensorPath, setEditSensorPath] = useState("temp_c");
  const [editSensorUnit, setEditSensorUnit] = useState("C");

  async function load() {
    const [devRes, profRes] = await Promise.all([fetch("/api/devices"), fetch("/api/snmp/profiles")]);
    if (devRes.ok) setDevices(await devRes.json());
    if (profRes.ok) setProfiles(await profRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const defaults = defaultChecksForType(type);
    setTcpPorts(defaults.tcp.join(","));
    setHttpUrl(defaults.http[0]?.url ?? "");
    setIcmp(Boolean(defaults.icmp));
  }, [type]);

  function buildChecks(): DeviceChecks {
    const tcp = parseTcpPortsInput(tcpPorts);
    const http = httpUrl.trim()
      ? [{ url: httpUrl.trim(), expectStatus: 200 }]
      : [];
    return parseDeviceChecks({ tcp, http, icmp }, type);
  }

  async function createDevice(formData: FormData) {
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname: formData.get("hostname"),
        ip: formData.get("ip"),
        type,
        location: formData.get("location"),
        city: formData.get("city"),
        checks: buildChecks(),
        ...(type === "sensor"
          ? { sensor_kind: sensorKind, sensor_json_path: sensorPath, last_sensor_unit: sensorKind === "humidity" ? "%" : sensorKind === "power" ? "W" : "C" }
          : {}),
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah device");
      return;
    }
    toast.success("Device ditambahkan");
    load();
  }

  async function setCity(id: string, city: string) {
    const res = await fetch(`/api/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: city || null }),
    });
    if (!res.ok) {
      toast.error("Unable to update city");
      return;
    }
    load();
  }

  function startEditChecks(device: Device) {
    const checks = parseDeviceChecks(device.checks, device.type);
    setEditId(device.id);
    setEditTcp(checks.tcp.join(","));
    setEditHttp(checks.http[0]?.url ?? "");
    setEditIcmp(Boolean(checks.icmp));
    setEditSkipAgent(Boolean(device.skip_poller_when_agent));
  }

  async function saveChecks() {
    if (!editId) return;
    const tcp = parseTcpPortsInput(editTcp);
    const http = editHttp.trim() ? [{ url: editHttp.trim(), expectStatus: 200 }] : [];
    const res = await fetch(`/api/devices/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checks: { tcp, http, icmp: editIcmp },
        skip_poller_when_agent: editSkipAgent,
      }),
    });
    if (!res.ok) {
      toast.error("Unable to update checks");
      return;
    }
    toast.success("Checks updated");
    setEditId(null);
    load();
  }

  async function openHistory(id: string) {
    setHistoryId(id);
    const res = await fetch(`/api/devices/${id}/checks?limit=30`);
    if (!res.ok) {
      toast.error("Unable to load history");
      return;
    }
    setHistory(await res.json());
  }

  function startEditSnmp(device: Device) {
    setSnmpId(device.id);
    setSnmpEnabled(Boolean(device.snmp_enabled));
    setSnmpVersion(device.snmp_version || "v2c");
    setSnmpCommunity(device.snmp_community_set ? "••••••••" : "");
    setSnmpPort(String(device.snmp_port ?? 161));
    setSnmpProfileId(device.snmp_profile_id ?? "");
  }

  async function saveSnmp() {
    if (!snmpId) return;
    const res = await fetch(`/api/devices/${snmpId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snmp_enabled: snmpEnabled,
        snmp_version: snmpVersion,
        snmp_community: snmpCommunity || null,
        snmp_port: Number(snmpPort) || 161,
        snmp_profile_id: snmpProfileId || null,
      }),
    });
    if (!res.ok) {
      toast.error("Unable to update SNMP");
      return;
    }
    toast.success("SNMP updated");
    setSnmpId(null);
    load();
  }

  function startEditSensor(device: Device) {
    setSensorId(device.id);
    setEditSensorKind(device.sensor_kind || "temperature");
    setEditSensorPath(device.sensor_json_path || "temp_c");
    setEditSensorUnit(device.last_sensor_unit || "C");
  }

  async function saveSensor() {
    if (!sensorId) return;
    const res = await fetch(`/api/devices/${sensorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sensor_kind: editSensorKind,
        sensor_json_path: editSensorPath,
        last_sensor_unit: editSensorUnit,
      }),
    });
    if (!res.ok) {
      toast.error("Unable to update sensor");
      return;
    }
    toast.success("Sensor updated");
    setSensorId(null);
    load();
  }

  async function bulk(action: "delete" | "set_unknown") {
    const res = await fetch("/api/devices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, action }),
    });
    if (!res.ok) {
      toast.error("Bulk action gagal");
      return;
    }
    toast.success("Bulk action selesai");
    setSelected([]);
    load();
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Devices</h1>
        <p className="text-sm text-muted-foreground">
          Multi-check poller: TCP ports, optional HTTP synthetic, optional ICMP. City places the device on the
          Indonesia site map.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add device</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDevice} className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Input name="hostname" placeholder="hostname" required />
            <Input name="ip" placeholder="ip" required />
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              {DEVICE_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input name="location" placeholder="site / rack" />
            <CitySelect name="city" />
            <Button type="submit">Add</Button>
            <Input
              value={tcpPorts}
              onChange={(e) => setTcpPorts(e.target.value)}
              placeholder="TCP ports (80,443)"
              className="md:col-span-2"
            />
            <Input
              value={httpUrl}
              onChange={(e) => setHttpUrl(e.target.value)}
              placeholder={type === "sensor" ? "Sensor HTTP JSON URL" : "HTTP check URL (optional)"}
              className="md:col-span-2"
            />
            {type === "sensor" && (
              <>
                <select className={selectClass} value={sensorKind} onChange={(e) => setSensorKind(e.target.value)}>
                  <option value="temperature">temperature</option>
                  <option value="humidity">humidity</option>
                  <option value="power">power</option>
                  <option value="other">other</option>
                </select>
                <Input value={sensorPath} onChange={(e) => setSensorPath(e.target.value)} placeholder="JSON path e.g. temp_c" />
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={icmp} onChange={(e) => setIcmp(e.target.checked)} />
              ICMP ping
            </label>
          </form>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!selected.length} onClick={() => bulk("set_unknown")}>
          Mark unknown
        </Button>
        <Button variant="destructive" disabled={!selected.length} onClick={() => bulk("delete")}>
          Delete selected
        </Button>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-3"></th>
                <th className="p-3">Hostname</th>
                <th className="p-3">IP</th>
                <th className="p-3">Type</th>
                <th className="p-3">Checks</th>
                <th className="p-3">Latency</th>
                <th className="p-3">SNMP</th>
                <th className="p-3">Reading</th>
                <th className="p-3">Location</th>
                <th className="p-3">City</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const checks = parseDeviceChecks(device.checks, device.type);
                return (
                  <tr key={device.id} className="border-b border-border/70">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.includes(device.id)} onChange={() => toggle(device.id)} />
                    </td>
                    <td className="p-3 font-medium">
                      {device.display_name ? (
                        <>
                          <span>{device.display_name}</span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{device.hostname}</span>
                        </>
                      ) : (
                        device.hostname
                      )}
                    </td>
                    <td className="p-3 font-mono">{device.ip}</td>
                    <td className="p-3 capitalize">{device.type}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{formatChecksSummary(checks)}</td>
                    <td className="p-3 font-mono text-xs">
                      {device.last_check_latency_ms != null ? `${device.last_check_latency_ms} ms` : "—"}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {device.snmp_enabled ? (device.snmp_last_error ? "err" : "on") : "—"}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {device.last_sensor_value != null
                        ? `${device.last_sensor_value}${device.last_sensor_unit || ""}`
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{device.location ?? "—"}</td>
                    <td className="p-3">
                      <CitySelect
                        value={device.city ?? resolveDeviceCity(device)?.slug ?? ""}
                        onChange={(city) => setCity(device.id, city)}
                        className="h-8 max-w-[180px] rounded-md border border-input bg-background px-2 text-xs"
                      />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={device.status} />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => startEditChecks(device)}>
                          Checks
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => startEditSnmp(device)}>
                          SNMP
                        </Button>
                        {device.type === "sensor" && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => startEditSensor(device)}>
                            Sensor
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" onClick={() => void openHistory(device.id)}>
                          Hist
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit checks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              TCP ports
              <Input value={editTcp} onChange={(e) => setEditTcp(e.target.value)} className="w-[200px]" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              HTTP URL
              <Input value={editHttp} onChange={(e) => setEditHttp(e.target.value)} className="w-[280px]" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={editIcmp} onChange={(e) => setEditIcmp(e.target.checked)} />
              ICMP
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={editSkipAgent} onChange={(e) => setEditSkipAgent(e.target.checked)} />
              Skip poller when agent fresh
            </label>
            <Button type="button" size="sm" onClick={() => void saveChecks()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {snmpId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit SNMP</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={snmpEnabled} onChange={(e) => setSnmpEnabled(e.target.checked)} />
              Enabled
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Version
              <select className={selectClass} value={snmpVersion} onChange={(e) => setSnmpVersion(e.target.value)}>
                <option value="v2c">v2c</option>
                <option value="v3">v3 (not polled yet)</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Community
              <Input
                value={snmpCommunity}
                onChange={(e) => setSnmpCommunity(e.target.value)}
                className="w-[160px]"
                placeholder="public"
                type="password"
                autoComplete="off"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Port
              <Input value={snmpPort} onChange={(e) => setSnmpPort(e.target.value)} className="w-[90px]" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Profile
              <select className={selectClass} value={snmpProfileId} onChange={(e) => setSnmpProfileId(e.target.value)}>
                <option value="">Select…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.system ? " (system)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" size="sm" onClick={() => void saveSnmp()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setSnmpId(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {sensorId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit sensor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Kind
              <select className={selectClass} value={editSensorKind} onChange={(e) => setEditSensorKind(e.target.value)}>
                <option value="temperature">temperature</option>
                <option value="humidity">humidity</option>
                <option value="power">power</option>
                <option value="other">other</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              JSON path
              <Input value={editSensorPath} onChange={(e) => setEditSensorPath(e.target.value)} className="w-[160px]" />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Unit
              <Input value={editSensorUnit} onChange={(e) => setEditSensorUnit(e.target.value)} className="w-[80px]" />
            </label>
            <Button type="button" size="sm" onClick={() => void saveSensor()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setSensorId(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {historyId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Check history</CardTitle>
            <Button type="button" size="sm" variant="ghost" onClick={() => setHistoryId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
            {history.map((row) => (
              <p key={row.id}>
                {new Date(row.ts).toISOString().slice(0, 19).replace("T", " ")} · {row.status} ·{" "}
                {row.latency_ms != null ? `${row.latency_ms}ms` : "—"}
              </p>
            ))}
            {history.length === 0 && <p>No samples yet — wait for the next poller tick.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
