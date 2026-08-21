import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export default async function PortalTicketsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { connector: { select: { name: true } } },
    orderBy: { updated_at: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-sm text-muted-foreground">Read-only view of incidents opened with your ticketing system.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tickets.length} tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-3">
              <div>
                <p className="font-medium">{ticket.title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {ticket.connector.name} · {ticket.external_id || "local"}
                </p>
              </div>
              <StatusBadge status={ticket.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
