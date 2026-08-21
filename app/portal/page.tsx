import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { redirect } from "next/navigation";

export default async function PortalPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const [devices, alerts, cis] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: session.user.tenantId } }),
    prisma.alert.findMany({
      where: { tenant_id: session.user.tenantId, status: "firing" },
      include: { device: true },
    }),
    prisma.cmdb_ci.count({ where: { tenant_id: session.user.tenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer portal</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of your assets, CMDB, topology, and AI insights. You cannot change production.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent className="font-mono text-3xl">{devices.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>CMDB items</CardTitle></CardHeader>
          <CardContent className="font-mono text-3xl">{cis}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open incidents</CardTitle></CardHeader>
          <CardContent className="font-mono text-3xl text-crit">{alerts.length}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Your devices</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="flex justify-between">
                <span>{device.hostname}</span>
                <StatusBadge status={device.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open incidents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">All clear.</p>}
            {alerts.map((alert) => (
              <div key={alert.id} className="flex justify-between">
                <span>{alert.device.hostname}</span>
                <StatusBadge status={alert.severity} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
