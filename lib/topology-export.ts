import { prisma } from "@/lib/prisma";

export type TopologyLinkRow = {
  from: string;
  to: string;
  status: string;
};

export type TopologyDeviceRow = {
  hostname: string;
  ip: string;
  type: string;
  status: string;
};

export async function getTopologyExport(tenantId: string) {
  const [links, devices] = await Promise.all([
    prisma.device_link.findMany({
      where: { tenant_id: tenantId },
      include: {
        from_device: { select: { hostname: true, ip: true } },
        to_device: { select: { hostname: true, ip: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.device.findMany({
      where: { tenant_id: tenantId },
      select: { hostname: true, ip: true, type: true, status: true },
      orderBy: { hostname: "asc" },
    }),
  ]);

  const linkRows: TopologyLinkRow[] = links.map((link) => ({
    from: link.from_device.hostname || link.from_device.ip,
    to: link.to_device.hostname || link.to_device.ip,
    status: link.status,
  }));

  const deviceRows: TopologyDeviceRow[] = devices.map((device) => ({
    hostname: device.hostname,
    ip: device.ip,
    type: device.type,
    status: device.status,
  }));

  return { linkRows, deviceRows };
}

export function topologyCsv(rows: TopologyLinkRow[]) {
  const header = "from,to,status";
  const body = rows.map((row) =>
    [row.from, row.to, row.status]
      .map((cell) => (cell.includes(",") ? `"${cell.split('"').join('""')}"` : cell))
      .join(","),
  );
  return [header, ...body, ""].join("\n");
}
