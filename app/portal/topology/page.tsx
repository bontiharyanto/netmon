import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { NetworkMap } from "@/components/topology/network-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalTopologyPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const [devices, links] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: session.user.tenantId } }),
    prisma.device_link.findMany({ where: { tenant_id: session.user.tenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Visual topology</h1>
        <p className="text-sm text-muted-foreground">The same live map your NOC sees. View only.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Live map</CardTitle></CardHeader>
        <CardContent>
          <NetworkMap devices={devices} links={links} />
        </CardContent>
      </Card>
    </div>
  );
}
