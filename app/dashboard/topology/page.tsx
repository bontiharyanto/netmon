import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { NetworkMap } from "@/components/topology/network-map";
import { TopologyUpload } from "@/components/topology/topology-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TopologyPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const canUpload = hasPermission(session.user.role, "topology.write", session.user.permissions);
  const [devices, links] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: session.user.tenantId } }),
    prisma.device_link.findMany({ where: { tenant_id: session.user.tenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Topology</h1>
        <p className="text-sm text-muted-foreground">
          Live map of device links. Upload CSV, Excel, or JSON. Download a filled CSV, Excel, or PDF of the current table.
        </p>
      </div>
      {canUpload && <TopologyUpload />}
      <Card>
        <CardHeader>
          <CardTitle>Live map · {links.length} links</CardTitle>
        </CardHeader>
        <CardContent>
          <NetworkMap devices={devices} links={links} />
        </CardContent>
      </Card>
    </div>
  );
}
