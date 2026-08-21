import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { endpointOf, parseTopologyFile } from "@/lib/topology-import";

export async function POST(req: Request) {
  try {
    const gate = await requirePermission("topology.write");
    if (gate.error || !gate.session) return gate.error;

    const form = await req.formData();
    const file = form.get("file");
    const replace = String(form.get("replace") ?? "") === "true";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const rows = parseTopologyFile(file.name, Buffer.from(await file.arrayBuffer()));
    const devices = await prisma.device.findMany({
      where: { tenant_id: gate.session.user.tenantId },
      select: { id: true, hostname: true, ip: true },
    });
    const index = new Map<string, string>();
    for (const device of devices) {
      index.set(device.hostname.toLowerCase(), device.id);
      index.set(device.ip, device.id);
    }

    if (replace) {
      await prisma.device_link.deleteMany({ where: { tenant_id: gate.session.user.tenantId } });
    }

    let imported = 0;
    let skipped = 0;
    const missing: string[] = [];

    for (const row of rows) {
      const edge = endpointOf(row);
      if (!edge.from || !edge.to || edge.from === edge.to) {
        skipped += 1;
        continue;
      }
      const fromId = index.get(edge.from.toLowerCase()) ?? index.get(edge.from);
      const toId = index.get(edge.to.toLowerCase()) ?? index.get(edge.to);
      if (!fromId || !toId) {
        skipped += 1;
        if (!fromId) missing.push(edge.from);
        if (!toId) missing.push(edge.to);
        continue;
      }

      const exists = await prisma.device_link.findFirst({
        where: {
          tenant_id: gate.session.user.tenantId,
          from_device_id: fromId,
          to_device_id: toId,
        },
      });
      if (exists) {
        await prisma.device_link.update({ where: { id: exists.id }, data: { status: edge.status } });
        imported += 1;
        continue;
      }

      await prisma.device_link.create({
        data: {
          tenant_id: gate.session.user.tenantId,
          from_device_id: fromId,
          to_device_id: toId,
          status: edge.status,
        },
      });
      imported += 1;
    }

    await writeAudit(
      gate.session.user.tenantId,
      gate.session.user.id,
      `topology.import:${imported}:skip${skipped}`,
    );

    return NextResponse.json({
      imported,
      skipped,
      missing: Array.from(new Set(missing)).slice(0, 12),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
