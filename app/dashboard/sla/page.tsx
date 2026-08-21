import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SlaPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const slas = await prisma.sla.findMany({
    include: { device: true },
    orderBy: { uptime_30d: "asc" },
  });
  const rows = slas.filter((row) => row.device.tenant_id === session.user.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SLA</h1>
        <p className="text-sm text-muted-foreground">Uptime 30 hari per device.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardHeader>
              <CardTitle>{row.device.hostname}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl">{row.uptime_30d.toFixed(3)}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, row.uptime_30d)}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
