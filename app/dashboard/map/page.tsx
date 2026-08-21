import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { SiteMap } from "@/components/map/site-map";

export default async function MapPage() {
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
        <p className="text-sm text-muted-foreground">
          Indonesia cities where this tenant’s devices are installed. Set City on Inventory, or put a city name in
          Location.
        </p>
      </div>
      <SiteMap devices={devices} />
    </div>
  );
}
