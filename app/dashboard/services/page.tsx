"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { defaultChecksForType, parseDeviceChecks, parseTcpPortsInput } from "@/lib/device-checks";

type ServiceDevice = {
  id: string;
  hostname: string;
  display_name: string | null;
  ip: string;
  type: string;
  status: string;
  checks: unknown;
  last_check_at: string | null;
  last_check_status: string | null;
  last_check_latency_ms: number | null;
  skip_poller_when_agent: boolean;
};

type HistoryRow = {
  id: string;
  ts: string;
  status: string;
  latency_ms: number | null;
  detail: Array<{ kind: string; target: string; ok: boolean; ms?: number }>;
};

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceDevice[]>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [ip, setIp] = useState("");
  const [httpUrl, setHttpUrl] = useState("https://");
  const [expect, setExpect] = useState("200");
  const [tcp, setTcp] = useState("443");

  async function load() {
    const res = await fetch("/api/devices");
    if (!res.ok) return;
    const all = (await res.json()) as ServiceDevice[];
    setServices(all.filter((d) => d.type === "application" || d.type === "service"));
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    return {
      total: services.length,
      up: services.filter((s) => s.status === "up").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      down: services.filter((s) => s.status === "down").length,
    };
  }, [services]);

  async function createService(event: React.FormEvent) {
    event.preventDefault();
    const ports = parseTcpPortsInput(tcp);
    const checks = parseDeviceChecks(
      {
        tcp: ports.length ? ports : defaultChecksForType("application").tcp,
        http: httpUrl.trim().startsWith("http")
          ? [{ url: httpUrl.trim(), expectStatus: Number(expect) || 200 }]
          : [],
      },
      "application",
    );
    const hostKey = hostname || name.toLowerCase().replace(/\s+/g, "-");
    let address = ip.trim();
    if (!address || address === "0.0.0.0") {
      let hash = 0;
      for (let i = 0; i < hostKey.length; i += 1) hash = (hash * 31 + hostKey.charCodeAt(i)) >>> 0;
      address = `198.18.${(hash >> 8) & 255}.${hash & 255}`;
    }
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname: hostKey,
        ip: address,
        type: "application",
        display_name: name,
        checks,
      }),
    });
    if (!res.ok) {
      toast.error("Unable to create service");
      return;
    }
    toast.success("Service added");
    setName("");
    setHostname("");
    setIp("");
    setHttpUrl("https://");
    void load();
  }

  async function openHistory(id: string) {
    setHistoryId(id);
    const res = await fetch(`/api/devices/${id}/checks?limit=30`);
    if (!res.ok) {
      toast.error("Unable to load check history");
      return;
    }
    setHistory(await res.json());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="text-sm text-muted-foreground">
          Business applications and HTTP synthetics. Status comes from multi-check probes (TCP / HTTP).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Services", value: summary.total },
          { label: "Up", value: summary.up },
          { label: "Degraded", value: summary.degraded },
          { label: "Down", value: summary.down },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-2xl">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add service</CardTitle>
          <CardDescription>Creates an inventory device with type application and an HTTP check.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createService} className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="hostname key" value={hostname} onChange={(e) => setHostname(e.target.value)} />
            <Input placeholder="IP (optional)" value={ip} onChange={(e) => setIp(e.target.value)} />
            <Input placeholder="Health URL" value={httpUrl} onChange={(e) => setHttpUrl(e.target.value)} />
            <Input placeholder="Expect status" value={expect} onChange={(e) => setExpect(e.target.value)} />
            <Input placeholder="TCP ports" value={tcp} onChange={(e) => setTcp(e.target.value)} />
            <Button type="submit" className="md:col-span-3 xl:col-span-6 w-fit">
              Add service
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Host / IP</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Last check</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((row) => {
                const checks = parseDeviceChecks(row.checks, row.type);
                return (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="px-5 py-3">
                      <p className="font-medium">{row.display_name || row.hostname}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {checks.http[0]?.url ?? `tcp:${checks.tcp.join(",")}`}
                      </p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {row.hostname}
                      <br />
                      {row.ip}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {row.last_check_latency_ms != null ? `${row.last_check_latency_ms} ms` : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {row.last_check_at ? new Date(row.last_check_at).toISOString().slice(0, 16).replace("T", " ") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openHistory(row.id)}>
                        History
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={6}>
                    No application/service devices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {historyId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Check history</CardTitle>
              <CardDescription>Latest probe samples for this service</CardDescription>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setHistoryId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Time UTC</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Latency</th>
                  <th className="px-5 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="px-5 py-2.5 font-mono text-xs">
                      {new Date(row.ts).toISOString().slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">
                      {row.latency_ms != null ? `${row.latency_ms} ms` : "—"}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {(row.detail ?? [])
                        .map((d) => `${d.kind}:${d.ok ? "ok" : "fail"}${d.ms != null ? `(${d.ms}ms)` : ""}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
