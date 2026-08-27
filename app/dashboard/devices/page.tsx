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
};

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

  async function load() {
    const res = await fetch("/api/devices");
    setDevices(await res.json());
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
  }

  async function saveChecks() {
    if (!editId) return;
    const tcp = parseTcpPortsInput(editTcp);
    const http = editHttp.trim() ? [{ url: editHttp.trim(), expectStatus: 200 }] : [];
    const res = await fetch(`/api/devices/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checks: { tcp, http, icmp: editIcmp } }),
    });
    if (!res.ok) {
      toast.error("Unable to update checks");
      return;
    }
    toast.success("Checks updated");
    setEditId(null);
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
              placeholder="HTTP check URL (optional)"
              className="md:col-span-2"
            />
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
                    <td className="p-3 font-medium">{device.hostname}</td>
                    <td className="p-3 font-mono">{device.ip}</td>
                    <td className="p-3 capitalize">{device.type}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{formatChecksSummary(checks)}</td>
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
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEditChecks(device)}>
                        Checks
                      </Button>
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
            <Button type="button" size="sm" onClick={() => void saveChecks()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
