import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function TopologyPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const [devices, links] = await Promise.all([
    prisma.device.findMany({ where: { tenant_id: session.user.tenantId } }),
    prisma.device_link.findMany({
      where: { tenant_id: session.user.tenantId },
      include: { from_device: true, to_device: true },
    }),
  ]);

  const positions = devices.map((device, index) => {
    const angle = (index / Math.max(devices.length, 1)) * Math.PI * 2;
    return {
      ...device,
      x: 280 + Math.cos(angle) * 180,
      y: 220 + Math.sin(angle) * 150,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Topology</h1>
        <p className="text-sm text-muted-foreground">Peta tautan antar device.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Live map</CardTitle></CardHeader>
        <CardContent>
          <svg viewBox="0 0 560 440" className="h-[440px] w-full rounded-lg bg-muted/30">
            {links.map((link) => {
              const from = positions.find((d) => d.id === link.from_device_id);
              const to = positions.find((d) => d.id === link.to_device_id);
              if (!from || !to) return null;
              const color = link.status === "down" ? "#ef4444" : link.status === "degraded" ? "#f59e0b" : "#00E5C3";
              return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="2" />;
            })}
            {positions.map((device) => (
              <g key={device.id}>
                <circle cx={device.x} cy={device.y} r="14" fill={device.status === "down" ? "#ef4444" : "#00E5C3"} />
                <text x={device.x} y={device.y + 28} textAnchor="middle" fill="currentColor" fontSize="11">
                  {device.hostname}
                </text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
