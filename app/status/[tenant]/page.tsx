import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/brand/logo";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StatusPage({ params }: { params: { tenant: string } }) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenant } });
  if (!tenant) notFound();

  const devices = await prisma.device.findMany({
    where: { tenant_id: tenant.id },
    include: { sla: true },
  });
  const operational = devices.every((d) => d.status !== "down");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold">{tenant.name} status</h1>
      <p className="mt-2 text-muted-foreground">
        {operational ? "All systems operational" : "Degraded performance"}
      </p>
      <Card className="mt-8">
        <CardHeader><CardTitle>Services</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between">
              <div>
                <p>{device.hostname}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  SLA 30d {device.sla?.uptime_30d.toFixed(2) ?? "100.00"}%
                </p>
              </div>
              <StatusBadge status={device.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
