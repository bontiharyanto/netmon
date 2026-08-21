"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  Gauge,
  GitFork,
  MapPin,
  Radio,
  Server,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { DashboardOverview } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const fade = { duration: 0.2 };

const chartTooltip = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
  },
  labelStyle: { color: "hsl(var(--foreground))" },
  itemStyle: { color: "hsl(var(--foreground))" },
};

function timeAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(delta / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "ok" | "warn" | "crit" | "primary";
}) {
  const color =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "crit"
          ? "text-crit"
          : "text-primary";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={fade}>
      <Card className="overflow-hidden">
        <CardContent className="flex items-start justify-between p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn("mt-2 font-mono text-3xl font-semibold", color)}>{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
          <span className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function NocBoard({ data }: { data: DashboardOverview }) {
  const { kpis, series, types, locations, worstSla, devices, alerts, tenant } = data;
  const pie = [
    { name: "Up", value: kpis.up, color: "#22c55e" },
    { name: "Degraded", value: kpis.degraded, color: "#f59e0b" },
    { name: "Down", value: kpis.down, color: "#ef4444" },
    { name: "Unknown", value: kpis.unknown, color: "#64748b" },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">NETMON NOC</p>
          <h1 className="mt-1 text-2xl font-semibold">{tenant?.name ?? "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">
            {tenant?.slug}.netmon.click · plan {tenant?.plan} · live tenant isolation
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Link href="/dashboard/devices" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
            Devices
          </Link>
          <Link href="/dashboard/alerts" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
            Alerts
          </Link>
          <Link href="/dashboard/topology" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
            Topology
          </Link>
          <Link href="/dashboard/map" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
            Map
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Devices" value={kpis.devices} hint={`${kpis.up} up · ${kpis.down} down`} icon={Server} />
        <Kpi
          label="Availability"
          value={`${kpis.availability}%`}
          hint={`${kpis.degraded} degraded`}
          icon={Radio}
          tone={kpis.down ? "warn" : "ok"}
        />
        <Kpi
          label="Firing alerts"
          value={kpis.firing}
          hint="Need operator action"
          icon={AlertTriangle}
          tone={kpis.firing ? "crit" : "ok"}
        />
        <Kpi
          label="SLA 30d"
          value={`${kpis.sla30d}%`}
          hint={`${kpis.agentsOnline}/${kpis.agents} agents online · ${kpis.links} links`}
          icon={Gauge}
          tone={kpis.sla30d < 99 ? "warn" : "ok"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Resource trend · 24h</CardTitle>
            <CardDescription>Average CPU, RAM, and disk across polled devices</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5C3" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00E5C3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ram" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 18%)" />
                <XAxis dataKey="t" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="cpu" stroke="#00E5C3" fill="url(#cpu)" strokeWidth={2} />
                <Area type="monotone" dataKey="ram" stroke="#38BDF8" fill="url(#ram)" strokeWidth={2} />
                <Area type="monotone" dataKey="disk" stroke="#F59E0B" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health mix</CardTitle>
            <CardDescription>Current device status</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>
                  {pie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-[-12px] flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {pie.map((row) => (
                <span key={row.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                  {row.name} {row.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Live alerts</CardTitle>
              <CardDescription>Latest events in this tenant</CardDescription>
            </div>
            <AlertTriangle className="h-4 w-4 text-crit" />
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                <div>
                  <p className="font-medium">{alert.event.replaceAll("_", " ")}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {alert.hostname} · {timeAgo(alert.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worst SLA</CardTitle>
            <CardDescription>Devices furthest from 100% / 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {worstSla.map((row) => (
              <div key={row.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{row.hostname}</span>
                  <span className="font-mono text-xs">{row.sla.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full",
                      row.sla < 98 ? "bg-crit" : row.sla < 99.5 ? "bg-warn" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, row.sla)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {types.map((row) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span className="capitalize">{row.name}</span>
                <span className="font-mono text-muted-foreground">
                  {row.up}/{row.total}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Sites</CardTitle>
            <Link href="/dashboard/map" className="text-xs text-primary hover:underline">
              Map
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {locations.map((row) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.up} up{row.down ? ` · ${row.down} down` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick modules</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {[
              { href: "/dashboard/devices", label: "Poller", icon: Activity },
              { href: "/dashboard/topology", label: "Topology", icon: GitFork },
              { href: "/dashboard/map", label: "Map", icon: MapPin },
              { href: "/dashboard/agents", label: "Agents", icon: Bot },
              { href: "/dashboard/sla", label: "SLA", icon: Gauge },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-3 hover:bg-muted"
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device inventory</CardTitle>
          <CardDescription>All devices in the current tenant</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Hostname</th>
                <th className="px-5 py-3">IP</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">SLA</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-border/70 last:border-0">
                  <td className="px-5 py-3 font-medium">{device.hostname}</td>
                  <td className="px-5 py-3 font-mono text-xs">{device.ip}</td>
                  <td className="px-5 py-3 capitalize">{device.type}</td>
                  <td className="px-5 py-3 text-muted-foreground">{device.location ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{device.sla.toFixed(2)}%</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={device.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
