import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { OpenTicketButton } from "@/components/tickets/open-ticket-button";
import { autoOpenTicketsForTenant } from "@/lib/tickets";

export default async function AlertsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const canWrite = hasPermission(session.user.role, "alert.write");
  try {
    await autoOpenTicketsForTenant(session.user.tenantId);
  } catch (error) {
    console.error("auto-ticket", error);
  }

  const alerts = await prisma.alert.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { device: true },
    orderBy: { created_at: "desc" },
  });

  const tickets = alerts.length
    ? await prisma.ticket.findMany({
        where: {
          tenant_id: session.user.tenantId,
          alert_id: { in: alerts.map((alert) => alert.id) },
        },
        select: { id: true, alert_id: true, external_id: true, status: true },
        orderBy: { created_at: "desc" },
      }).catch(() => [])
    : [];

  const ticketByAlert = new Map<string, (typeof tickets)[number]>();
  for (const ticket of tickets) {
    if (ticket.alert_id && !ticketByAlert.has(ticket.alert_id)) {
      ticketByAlert.set(ticket.alert_id, ticket);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Firing alerts auto-open a NETMON ticket when severity and event rules match.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{alerts.length} events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.map((alert) => {
            const ticket = ticketByAlert.get(alert.id);
            return (
              <div key={alert.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-3">
                <div>
                  <p className="font-medium">{alert.event}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {alert.device.hostname} · {alert.created_at.toISOString()}
                    {ticket ? ` · ticket ${ticket.external_id || ticket.id}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={alert.severity} />
                  <StatusBadge status={alert.status} />
                  {ticket && <StatusBadge status={ticket.status} />}
                  {canWrite && alert.status === "firing" && !ticket && <OpenTicketButton alertId={alert.id} />}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
