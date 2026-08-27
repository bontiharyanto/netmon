import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { resolveDeviceCity } from "@/lib/geo/indonesia-cities";
import { formatChecksSummary, parseDeviceChecks } from "@/lib/device-checks";

export default async function PortalAssetsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const devices = await prisma.device.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { sla: true },
    orderBy: { hostname: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assets</h1>
        <p className="text-sm text-muted-foreground">Full inventory for your tenant. Read-only.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{devices.length} configuration assets</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Hostname</th>
                <th className="px-5 py-3">IP</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Checks</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">SLA</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const checks = parseDeviceChecks(device.checks, device.type);
                return (
                  <tr key={device.id} className="border-b border-border/70">
                    <td className="px-5 py-3 font-medium">{device.display_name || device.hostname}</td>
                    <td className="px-5 py-3 font-mono text-xs">{device.ip}</td>
                    <td className="px-5 py-3 capitalize">{device.type}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-muted-foreground">
                      {formatChecksSummary(checks)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {device.last_check_latency_ms != null ? `${device.last_check_latency_ms} ms` : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{device.location ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{resolveDeviceCity(device)?.name ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs">{(device.sla?.uptime_30d ?? 100).toFixed(2)}%</td>
                    <td className="px-5 py-3"><StatusBadge status={device.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
