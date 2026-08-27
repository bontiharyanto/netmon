import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatChecksSummary, parseDeviceChecks } from "@/lib/device-checks";

export default async function PortalServicesPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const services = await prisma.device.findMany({
    where: {
      tenant_id: session.user.tenantId,
      type: { in: ["application", "service"] },
    },
    orderBy: { hostname: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="text-sm text-muted-foreground">Read-only application availability for your tenant.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>{services.length} services</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Checks</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((row) => {
                const checks = parseDeviceChecks(row.checks, row.type);
                return (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="px-5 py-3">
                      <p className="font-medium">{row.display_name || row.hostname}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{row.ip}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{formatChecksSummary(checks)}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {row.last_check_latency_ms != null ? `${row.last_check_latency_ms} ms` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-sm text-muted-foreground" colSpan={4}>
                    No services published for this tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
