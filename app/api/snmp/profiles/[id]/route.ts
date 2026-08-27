import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { parseSnmpOids } from "@/lib/snmp-profiles";

const oidSchema = z.object({
  key: z.string().min(1).max(64),
  oid: z.string().min(1).max(128),
  metric: z.enum(["cpu_percent", "ram_percent", "disk_percent", "custom"]),
  scale: z.number().optional(),
});

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  oids: z.array(oidSchema).min(1).max(32).optional(),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.snmp_profile.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) {
    const system = await prisma.snmp_profile.findFirst({ where: { id: params.id, tenant_id: null } });
    if (system) return NextResponse.json({ error: "System profiles are read-only" }, { status: 403 });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await prisma.snmp_profile.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      oids: parsed.data.oids === undefined ? undefined : (parsed.data.oids as unknown as Prisma.InputJsonValue),
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `snmp_profile.update:${row.name}`);
  return NextResponse.json({ ...row, system: false, oids: parseSnmpOids(row.oids) });
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.snmp_profile.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) {
    const system = await prisma.snmp_profile.findFirst({ where: { id: params.id, tenant_id: null } });
    if (system) return NextResponse.json({ error: "System profiles are read-only" }, { status: 403 });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.snmp_profile.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `snmp_profile.delete:${existing.name}`);
  return NextResponse.json({ ok: true });
}
