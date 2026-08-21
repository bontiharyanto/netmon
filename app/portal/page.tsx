import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { redirect } from "next/navigation";

export default async function PortalPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const [devices, alerts] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: session.user.tenantId } }),
    prisma.alert.findMany({
      where: { tenant_id: session.user.tenantId, status: "firing" },
      include: { device: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portal customer</h1>
        <p className="text-sm text-muted-foreground">Tampilan read-only untuk viewer.</p>
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
