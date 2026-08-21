import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId;

  const [devices, alerts, slas] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: tenantId }, orderBy: { hostname: "asc" } }),
    prisma.alert.findMany({
      where: { tenant_id: tenantId, status: "firing" },
      include: { device: true },
      orderBy: { created_at: "desc" },
      take: 8,
    }),
    prisma.sla.findMany({ include: { device: true } }),
  ]);

  const tenantSlas = slas.filter((row) => row.device.tenant_id === tenantId);
  const up = devices.filter((d) => d.status === "up").length;
  const avgSla =
    tenantSlas.length === 0
      ? 100
      : tenantSlas.reduce((sum, row) => sum + row.uptime_30d, 0) / tenantSlas.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">NOC Overview</h1>
        <p className="text-sm text-muted-foreground">Isolasi tenant aktif. Poller, alert, dan SLA dalam satu layar.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
          <CardContent className="text-3xl font-mono">{devices.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Up</CardTitle></CardHeader>
          <CardContent className="text-3xl font-mono text-ok">{up}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Firing alerts</CardTitle></CardHeader>
          <CardContent className="text-3xl font-mono text-crit">{alerts.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>SLA 30d</CardTitle></CardHeader>
          <CardContent className="text-3xl font-mono">{avgSla.toFixed(2)}%</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Devices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <div>
                  <p className="font-medium">{device.hostname}</p>
                  <p className="font-mono text-xs text-muted-foreground">{device.ip}</p>
                </div>
                <StatusBadge status={device.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Live alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada alert firing.</p>}
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <div>
                  <p className="font-medium">{alert.event}</p>
                  <p className="text-xs text-muted-foreground">{alert.device.hostname}</p>
                </div>
                <StatusBadge status={alert.severity} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
