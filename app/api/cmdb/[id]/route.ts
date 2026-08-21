import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).optional(),
  ci_type: z.string().min(2).optional(),
  asset_tag: z.string().nullable().optional(),
  serial: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.enum(["in_service", "maintenance", "retired", "outage"]).optional(),
  device_id: z.string().nullable().optional(),
});

function blank(value?: string | null) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function loadOwned(id: string, tenantId: string) {
  return prisma.cmdb_ci.findFirst({ where: { id, tenant_id: tenantId } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("cmdb.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await loadOwned(params.id, gate.session.user.tenantId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.ci_type !== undefined) data.ci_type = parsed.data.ci_type.trim();
  if (parsed.data.asset_tag !== undefined) data.asset_tag = blank(parsed.data.asset_tag);
  if (parsed.data.serial !== undefined) data.serial = blank(parsed.data.serial);
  if (parsed.data.owner !== undefined) data.owner = blank(parsed.data.owner);
  if (parsed.data.location !== undefined) data.location = blank(parsed.data.location);
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.device_id !== undefined) {
    const deviceId = blank(parsed.data.device_id);
    if (deviceId) {
      const device = await prisma.device.findFirst({
        where: { id: deviceId, tenant_id: gate.session.user.tenantId },
        select: { id: true },
      });
      if (!device) return NextResponse.json({ error: "Device not found" }, { status: 400 });
    }
    data.device_id = deviceId;
  }

  const item = await prisma.cmdb_ci.update({ where: { id: existing.id }, data });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `cmdb.update:${item.name}`);
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("cmdb.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await loadOwned(params.id, gate.session.user.tenantId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.cmdb_ci.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `cmdb.delete:${existing.name}`);
  return NextResponse.json({ ok: true });
}
