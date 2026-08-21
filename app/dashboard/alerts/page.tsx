import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { OpenTicketButton } from "@/components/tickets/open-ticket-button";

export default async function AlertsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const canWrite = hasPermission(session.user.role, "alert.write");
  const alerts = await prisma.alert.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { device: true, tickets: { select: { id: true, external_id: true, status: true } } },
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">Firing and resolved events. Open or respond via ticketing.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{alerts.length} events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-3">
              <div>
                <p className="font-medium">{alert.event}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {alert.device.hostname} · {alert.created_at.toISOString()}
                  {alert.tickets[0] ? ` · ticket ${alert.tickets[0].external_id || alert.tickets[0].id}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={alert.severity} />
                <StatusBadge status={alert.status} />
                {canWrite && alert.status === "firing" && <OpenTicketButton alertId={alert.id} />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
