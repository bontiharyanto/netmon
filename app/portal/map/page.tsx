import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { SiteMap } from "@/components/map/site-map";

export default async function PortalMapPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const devices = await prisma.device.findMany({
    where: { tenant_id: session.user.tenantId },
    orderBy: { hostname: "asc" },
    select: { id: true, hostname: true, ip: true, type: true, status: true, location: true, city: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Site map</h1>
        <p className="text-sm text-muted-foreground">Read-only map of where your devices are installed.</p>
      </div>
      <SiteMap devices={devices} />
    </div>
  );
}
