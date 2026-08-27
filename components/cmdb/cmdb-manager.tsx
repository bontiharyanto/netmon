"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

import { CMDB_RELATION_TYPES } from "@/lib/device-checks";

type DeviceOpt = { id: string; hostname: string; ip: string };
type Ci = {
  id: string;
  name: string;
  ci_type: string;
  asset_tag: string | null;
  serial: string | null;
  owner: string | null;
  status: string;
  location: string | null;
  device_id?: string | null;
  device: { hostname: string; ip: string; status: string } | null;
  last_synced_at?: string | Date | null;
  last_sync_error?: string | null;
};

type Relation = {
  id: string;
  relation_type: string;
  from_ci: { id: string; name: string; ci_type: string };
  to_ci: { id: string; name: string; ci_type: string };
};

type FormState = {
  name: string;
  ci_type: string;
  asset_tag: string;
  serial: string;
  owner: string;
  location: string;
  status: string;
  device_id: string;
};

const EMPTY: FormState = {
  name: "",
  ci_type: "hardware",
  asset_tag: "",
  serial: "",
  owner: "",
  location: "",
  status: "in_service",
  device_id: "",
};

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function fromItem(item: Ci): FormState {
  return {
    name: item.name,
    ci_type: item.ci_type,
    asset_tag: item.asset_tag ?? "",
    serial: item.serial ?? "",
    owner: item.owner ?? "",
    location: item.location ?? "",
    status: item.status,
    device_id: item.device_id ?? "",
  };
}

export function CmdbManager({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<Ci[]>([]);
  const [devices, setDevices] = useState<DeviceOpt[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromCi, setFromCi] = useState("");
  const [toCi, setToCi] = useState("");
  const [relType, setRelType] = useState<string>("runs_on");

  async function load() {
    const [ciRes, deviceRes, relRes] = await Promise.all([
      fetch("/api/cmdb"),
      fetch("/api/devices"),
      fetch("/api/cmdb/relations"),
    ]);
    if (ciRes.ok) setItems(await ciRes.json());
    if (deviceRes.ok) setDevices(await deviceRes.json());
    if (relRes.ok) setRelations(await relRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function payload() {
    return {
      name: form.name,
      ci_type: form.ci_type,
      asset_tag: form.asset_tag,
      serial: form.serial,
      owner: form.owner,
      location: form.location,
      status: form.status,
      device_id: form.device_id || null,
    };
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(editingId ? `/api/cmdb/${editingId}` : "/api/cmdb", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    if (!res.ok) {
      toast.error(editingId ? "Unable to update CI" : "Unable to add CI");
      return;
    }
    toast.success(editingId ? "CI updated" : "CI added");
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  async function remove(item: Ci) {
    if (!confirm(`Delete ${item.name}?`)) return;
    const res = await fetch(`/api/cmdb/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Unable to delete CI");
      return;
    }
    toast.success("CI deleted");
    if (editingId === item.id) {
      setEditingId(null);
      setForm(EMPTY);
    }
    load();
  }

  async function addRelation(event: React.FormEvent) {
    event.preventDefault();
    if (!fromCi || !toCi) return;
    const res = await fetch("/api/cmdb/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from_ci_id: fromCi, to_ci_id: toCi, relation_type: relType }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Unable to add relation");
      return;
    }
    toast.success("Relation added");
    setFromCi("");
    setToCi("");
    load();
  }

  async function removeRelation(id: string) {
    const res = await fetch(`/api/cmdb/relations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Unable to remove relation");
      return;
    }
    toast.success("Relation removed");
    load();
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit CI" : "Add CI"}</CardTitle>
            <CardDescription>Link a configuration item to an inventory device when it exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                required
              />
              <select
                className={selectClass}
                value={form.ci_type}
                onChange={(event) => setForm((f) => ({ ...f, ci_type: event.target.value }))}
              >
                <option value="hardware">hardware</option>
                <option value="server">server</option>
                <option value="application">application</option>
                <option value="database">database</option>
                <option value="service">service</option>
                <option value="circuit">circuit</option>
                <option value="software">software</option>
                <option value="license">license</option>
                <option value="site">site</option>
                {!["hardware", "circuit", "software", "license", "site"].includes(form.ci_type) && (
                  <option value={form.ci_type}>{form.ci_type}</option>
                )}
              </select>
              <Input
                placeholder="Asset tag"
                value={form.asset_tag}
                onChange={(event) => setForm((f) => ({ ...f, asset_tag: event.target.value }))}
              />
              <Input
                placeholder="Serial"
                value={form.serial}
                onChange={(event) => setForm((f) => ({ ...f, serial: event.target.value }))}
              />
              <Input
                placeholder="Owner"
                value={form.owner}
                onChange={(event) => setForm((f) => ({ ...f, owner: event.target.value }))}
              />
              <Input
                placeholder="Location"
                value={form.location}
                onChange={(event) => setForm((f) => ({ ...f, location: event.target.value }))}
              />
              <select
                className={selectClass}
                value={form.status}
                onChange={(event) => setForm((f) => ({ ...f, status: event.target.value }))}
              >
                <option value="in_service">in service</option>
                <option value="maintenance">maintenance</option>
                <option value="retired">retired</option>
                <option value="outage">outage</option>
              </select>
              <select
                className={selectClass}
                value={form.device_id}
                onChange={(event) => setForm((f) => ({ ...f, device_id: event.target.value }))}
              >
                <option value="">No linked device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.hostname} · {device.ip}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 md:col-span-4">
                <Button type="submit">{editingId ? "Save" : "Add"}</Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm(EMPTY);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>CMDB</CardTitle>
          <CardDescription>
            {items.length} configuration items
            {canWrite ? " · Edit or delete a row · NovaCRM sync uses the Ticketing connector" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">CI</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Asset tag</th>
                <th className="px-5 py-3">Serial</th>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Linked device</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">NovaCRM</th>
                {canWrite && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/70 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.location ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3 capitalize">{item.ci_type}</td>
                  <td className="px-5 py-3 font-mono text-xs">{item.asset_tag ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{item.serial ?? "—"}</td>
                  <td className="px-5 py-3">{item.owner ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {item.device ? `${item.device.hostname} · ${item.device.ip}` : "unlinked"}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3">
                    {item.last_sync_error ? (
                      <span className="text-xs text-destructive" title={item.last_sync_error}>
                        Sync error
                      </span>
                    ) : item.last_synced_at ? (
                      <span className="font-mono text-xs text-muted-foreground">Synced</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(item.id);
                            setForm(fromItem(item));
                          }}
                        >
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => remove(item)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={canWrite ? 9 : 8}>
                    No configuration items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CI relations</CardTitle>
          <CardDescription>
            Link Application → Server → Database (e.g. app <span className="font-mono">runs_on</span> server, app{" "}
            <span className="font-mono">backed_by</span> database).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && (
            <form onSubmit={addRelation} className="grid gap-3 md:grid-cols-4">
              <select className={selectClass} value={fromCi} onChange={(e) => setFromCi(e.target.value)} required>
                <option value="">From CI…</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.ci_type})
                  </option>
                ))}
              </select>
              <select className={selectClass} value={relType} onChange={(e) => setRelType(e.target.value)}>
                {CMDB_RELATION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select className={selectClass} value={toCi} onChange={(e) => setToCi(e.target.value)} required>
                <option value="">To CI…</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.ci_type})
                  </option>
                ))}
              </select>
              <Button type="submit">Add relation</Button>
            </form>
          )}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {relations.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <p>
                  <span className="font-medium">{row.from_ci.name}</span>
                  <span className="mx-2 font-mono text-xs text-primary">{row.relation_type}</span>
                  <span className="font-medium">{row.to_ci.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({row.from_ci.ci_type} → {row.to_ci.ci_type})
                  </span>
                </p>
                {canWrite && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => void removeRelation(row.id)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
            {relations.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">No relations yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
