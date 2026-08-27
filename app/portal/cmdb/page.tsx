import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { CmdbTable } from "@/components/cmdb/cmdb-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalCmdbPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const [items, relations] = await Promise.all([
    prisma.cmdb_ci.findMany({
      where: { tenant_id: session.user.tenantId },
      include: { device: { select: { hostname: true, ip: true, status: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.cmdb_relation.findMany({
      where: { tenant_id: session.user.tenantId },
      include: {
        from_ci: { select: { name: true, ci_type: true } },
        to_ci: { select: { name: true, ci_type: true } },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CMDB</h1>
        <p className="text-sm text-muted-foreground">Your configuration items and dependency links. Customers cannot edit records.</p>
      </div>
      <CmdbTable items={items} />
      <Card>
        <CardHeader>
          <CardTitle>Relations</CardTitle>
          <CardDescription>Application → Server → Database style links</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {relations.map((row) => (
              <li key={row.id} className="px-4 py-2.5 text-sm">
                <span className="font-medium">{row.from_ci.name}</span>
                <span className="mx-2 font-mono text-xs text-primary">{row.relation_type}</span>
                <span className="font-medium">{row.to_ci.name}</span>
              </li>
            ))}
            {relations.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">No relations published.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
