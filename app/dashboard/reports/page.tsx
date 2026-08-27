"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import {
  REPORT_TEMPLATES,
  type ReportMeta,
  type ReportPayload,
  type ReportTemplateId,
} from "@/lib/reports-types";

type Preset = "24h" | "7d" | "30d" | "month" | "custom";

const selectClass =
  "h-9 min-w-[9rem] rounded-md border border-input bg-background px-2 text-sm text-foreground";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymdLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ymdFromIso(value: string) {
  return value.slice(0, 10);
}

function rangeFor(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  if (preset === "24h") {
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
  }
  if (preset === "7d") {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
  }
  if (preset === "30d") {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
  }
  if (preset === "month") {
    return { from: ymdLocal(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymdLocal(now) };
  }
  return { from: customFrom, to: customTo };
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState(() => ymdLocal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(() => ymdLocal(new Date()));
  const [template, setTemplate] = useState<ReportTemplateId>("operations");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const queryParams = useCallback(
    (from: string, to: string, format: string) => {
      const params = new URLSearchParams({ from, to, format, template });
      if (city) params.set("city", city);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
      return params;
    },
    [template, city, type, status, severity],
  );

  const load = useCallback(
    async (from: string, to: string) => {
      if (!from || !to) {
        toast.error("Choose a start and end date");
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/reports?${queryParams(from, to, "json")}`);
      if (!res.ok) {
        toast.error("Unable to load report");
        setLoading(false);
        return;
      }
      setReport(await res.json());
      setLoading(false);
    },
    [queryParams],
  );

  useEffect(() => {
    void fetch("/api/reports/meta")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ReportMeta | null) => {
        if (data) setMeta(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const range = rangeFor(preset, customFrom, customTo);
    if (preset !== "custom") {
      setCustomFrom(ymdFromIso(range.from));
      setCustomTo(ymdFromIso(range.to));
    }
    void load(range.from, range.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, template, city, type, status, severity, load]);

  async function download(format: "pdf" | "xlsx" | "csv") {
    const { from, to } = rangeFor(preset, customFrom, customTo);
    setExporting(true);
    try {
      const res = await fetch(`/api/reports?${queryParams(from, to, format)}`);
      if (!res.ok) {
        toast.error("Download failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `netmon-report.${format}`;
      const header = res.headers.get("Content-Disposition");
      const match = header?.match(/filename=([^;]+)/);
      if (match) a.download = match[1];
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported`);
    } finally {
      setExporting(false);
    }
  }

  const summary = report?.summary;
  const showDevices = report ? report.devices.length > 0 || report.template === "inventory" || report.template === "sla" || report.template === "operations" : true;
  const showAlerts = report ? report.template === "operations" || report.template === "alerts" : true;
  const showTickets = report ? report.template === "operations" || report.template === "tickets" : true;

  const activeFilters = useMemo(() => {
    const parts: string[] = [];
    if (city) parts.push(`City: ${city}`);
    if (type) parts.push(`Type: ${type}`);
    if (status) parts.push(`Status: ${status}`);
    if (severity) parts.push(`Severity: ${severity}`);
    return parts;
  }, [city, type, status, severity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reporting Center</h1>
        <p className="text-sm text-muted-foreground">
          Choose a template, filter the estate, preview KPIs and tables, then export PDF, Excel, or CSV. Exports are
          audited. Device status is current; alerts and tickets follow the date range; SLA is the rolling 30-day figure.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {REPORT_TEMPLATES.map((item) => {
          const active = template === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTemplate(item.id)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors duration-200 ease-out ${
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Period & filters</CardTitle>
          <CardDescription>UTC bounds. Custom calendar dates use 00:00–23:59 UTC.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={preset === item.id ? "default" : "outline"}
                onClick={() => setPreset(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              From
              <Input
                type="date"
                value={customFrom}
                disabled={preset !== "custom"}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="w-[160px]"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              To
              <Input
                type="date"
                value={customTo}
                disabled={preset !== "custom"}
                onChange={(event) => setCustomTo(event.target.value)}
                className="w-[160px]"
              />
            </label>
            {preset === "custom" && (
              <Button type="button" variant="outline" onClick={() => load(customFrom, customTo)} disabled={loading}>
                Apply
              </Button>
            )}

            <label className="space-y-1 text-xs text-muted-foreground">
              City
              <select className={selectClass} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All</option>
                {(meta?.cities ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Type
              <select className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All</option>
                {(meta?.types ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Status
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                {(meta?.statuses ?? []).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            {(template === "operations" || template === "alerts") && (
              <label className="space-y-1 text-xs text-muted-foreground">
                Severity
                <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="">All</option>
                  {(meta?.severities ?? ["critical", "warning", "info"]).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="ml-auto flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => download("csv")} disabled={!report || exporting}>
                CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => download("xlsx")} disabled={!report || exporting}>
                Excel
              </Button>
              <Button type="button" onClick={() => download("pdf")} disabled={!report || exporting}>
                PDF
              </Button>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <p className="text-xs text-muted-foreground">Active filters · {activeFilters.join(" · ")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Devices",
            value: summary?.devices ?? "—",
            hint: summary ? `${summary.up} up · ${summary.down} down` : " ",
          },
          {
            label: "Alerts in period",
            value: summary?.alerts ?? "—",
            hint: summary ? `${summary.firing} firing` : " ",
          },
          {
            label: "Tickets in period",
            value: summary?.tickets ?? "—",
            hint: "Opened in range",
          },
          {
            label: "Avg SLA 30d",
            value: summary?.avg_sla ?? "—",
            hint: "Current rolling figure",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 font-mono text-2xl">{loading ? "…" : kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showDevices && (
        <Card>
          <CardHeader>
            <CardTitle>{template === "sla" ? "SLA ranking" : "Devices"}</CardTitle>
            <CardDescription>
              {report
                ? `${report.devices.length} shown${report.truncated.devices ? " (capped)" : ""} · CPU/RAM/disk averaged over the selected period`
                : loading
                  ? "Loading…"
                  : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Hostname</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">SLA</th>
                  <th className="px-5 py-3">CPU</th>
                  <th className="px-5 py-3">RAM</th>
                  <th className="px-5 py-3">Disk</th>
                </tr>
              </thead>
              <tbody>
                {(report?.devices ?? []).map((row) => (
                  <tr key={row.hostname} className="border-b border-border/70 odd:bg-muted/20">
                    <td className="px-5 py-2.5 font-medium">{row.hostname}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{row.ip}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{row.city}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{row.sla}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{row.cpu}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{row.ram}</td>
                    <td className="px-5 py-2.5 font-mono text-xs">{row.disk}</td>
                  </tr>
                ))}
                {!loading && report && report.devices.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={8}>
                      No devices match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showAlerts && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>
              {report
                ? `${report.alerts.length} shown · ${report.summary.alerts} in period${report.truncated.alerts ? " (capped)" : ""}`
                : loading
                  ? "Loading…"
                  : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Time UTC</th>
                  <th className="px-5 py-3">Device</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(report?.alerts ?? []).map((row, index) => (
                  <tr key={`${row.created_at}-${row.hostname}-${index}`} className="border-b border-border/70 odd:bg-muted/20">
                    <td className="px-5 py-2.5 font-mono text-xs">{row.created_at}</td>
                    <td className="px-5 py-2.5 font-medium">{row.hostname}</td>
                    <td className="px-5 py-2.5">{row.event}</td>
                    <td className="px-5 py-2.5 capitalize">{row.severity}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
                {!loading && report && report.alerts.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={5}>
                      No alerts in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showTickets && (
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              {report
                ? `${report.tickets.length} shown · ${report.summary.tickets} opened in period${report.truncated.tickets ? " (capped)" : ""}`
                : loading
                  ? "Loading…"
                  : "—"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Time UTC</th>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(report?.tickets ?? []).map((row, index) => (
                  <tr key={`${row.created_at}-${index}`} className="border-b border-border/70 odd:bg-muted/20">
                    <td className="px-5 py-2.5 font-mono text-xs">{row.created_at}</td>
                    <td className="px-5 py-2.5">{row.title}</td>
                    <td className="px-5 py-2.5 capitalize">{row.priority}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
                {!loading && report && report.tickets.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={4}>
                      No tickets in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
