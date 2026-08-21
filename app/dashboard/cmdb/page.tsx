import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CmdbTable } from "@/components/cmdb/cmdb-table";

export default async function CmdbPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const items = await prisma.cmdb_ci.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { device: { select: { hostname: true, ip: true, status: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CMDB</h1>
        <p className="text-sm text-muted-foreground">Configuration items for this tenant. Write access follows RBAC.</p>
      </div>
      <CmdbTable items={items} />
    </div>
  );
}
