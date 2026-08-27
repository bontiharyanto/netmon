import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { ALERT_EVENTS } from "@/lib/alert-events";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  event: z.enum(ALERT_EVENTS).optional(),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  device_id: z.string().nullable().optional(),
  device_type: z.string().max(64).nullable().optional(),
  config: z.record(z.unknown()).optional(),
  for_seconds: z.number().int().min(0).max(86400).optional(),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.alert_rule.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.device_id) {
    const device = await prisma.device.findFirst({
      where: { id: parsed.data.device_id, tenant_id: gate.session.user.tenantId },
      select: { id: true },
    });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 400 });
  }

  const row = await prisma.alert_rule.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      enabled: parsed.data.enabled,
      event: parsed.data.event,
      severity: parsed.data.severity,
      device_id: parsed.data.device_id === undefined ? undefined : parsed.data.device_id,
      device_type:
        parsed.data.device_type === undefined ? undefined : parsed.data.device_type?.trim() || null,
      config: parsed.data.config === undefined ? undefined : (parsed.data.config as Prisma.InputJsonValue),
      for_seconds: parsed.data.for_seconds,
    },
    include: { device: { select: { id: true, hostname: true } } },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `alert_rule.update:${row.name}`);
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.alert_rule.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.alert_rule.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `alert_rule.delete:${existing.name}`);
  return NextResponse.json({ ok: true });
}
