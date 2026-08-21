"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

type Device = {
  id: string;
  hostname: string;
  ip: string;
  type: string;
  status: string;
  location?: string | null;
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  async function load() {
    const res = await fetch("/api/devices");
    setDevices(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function createDevice(formData: FormData) {
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname: formData.get("hostname"),
        ip: formData.get("ip"),
        type: formData.get("type"),
        location: formData.get("location"),
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah device");
      return;
    }
    toast.success("Device ditambahkan");
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
        <p className="text-sm text-muted-foreground">Modul poller + bulk actions.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Add device</CardTitle></CardHeader>
        <CardContent>
          <form action={createDevice} className="grid gap-3 md:grid-cols-5">
            <Input name="hostname" placeholder="hostname" required />
            <Input name="ip" placeholder="ip" required />
            <Input name="type" placeholder="switch / firewall / server" required />
            <Input name="location" placeholder="location" />
            <Button type="submit">Add</Button>
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
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-border/70">
                  <td className="p-3">
                    <input type="checkbox" checked={selected.includes(device.id)} onChange={() => toggle(device.id)} />
                  </td>
                  <td className="p-3 font-medium">{device.hostname}</td>
                  <td className="p-3 font-mono">{device.ip}</td>
                  <td className="p-3">{device.type}</td>
                  <td className="p-3"><StatusBadge status={device.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
