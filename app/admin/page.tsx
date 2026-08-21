import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

export default async function AdminPage() {
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { devices: true, users: true } }, subscription: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Superadmin</h1>
        <p className="text-sm text-muted-foreground">Semua tenant di netmon.click</p>
      </div>
      <div className="grid gap-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{tenant.name}</CardTitle>
              <StatusBadge status={tenant.status} />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="font-mono">{tenant.slug}.netmon.click</span>
              <span>{tenant.plan}</span>
              <span>{tenant._count.devices} devices / {tenant.device_limit}</span>
              <span>{tenant._count.users} users</span>
              <span>billing: {tenant.subscription?.status ?? "none"}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
