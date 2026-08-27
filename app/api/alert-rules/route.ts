import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { ALERT_EVENTS } from "@/lib/alert-events";
import { ensureDefaultDeviceDownRule } from "@/lib/alert-eval";

const schema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().optional(),
  event: z.enum(ALERT_EVENTS),
  severity: z.enum(["critical", "warning", "info"]).optional(),
  device_id: z.string().nullable().optional(),
  device_type: z.string().max(64).nullable().optional(),
  config: z.record(z.unknown()).optional(),
  for_seconds: z.number().int().min(0).max(86400).optional(),
});

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;

  await ensureDefaultDeviceDownRule(gate.session.user.tenantId);

  const rows = await prisma.alert_rule.findMany({
    where: { tenant_id: gate.session.user.tenantId },
    include: { device: { select: { id: true, hostname: true } } },
    orderBy: [{ event: "asc" }, { created_at: "asc" }],
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (parsed.data.device_id) {
    const device = await prisma.device.findFirst({
      where: { id: parsed.data.device_id, tenant_id: gate.session.user.tenantId },
      select: { id: true },
    });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 400 });
  }

  const row = await prisma.alert_rule.create({
    data: {
      tenant_id: gate.session.user.tenantId,
      name: parsed.data.name.trim(),
      enabled: parsed.data.enabled ?? true,
      event: parsed.data.event,
      severity: parsed.data.severity ?? (parsed.data.event === "device_down" ? "critical" : "warning"),
      device_id: parsed.data.device_id ?? null,
      device_type: parsed.data.device_type?.trim() || null,
      config: (parsed.data.config ?? {}) as Prisma.InputJsonValue,
      for_seconds: parsed.data.for_seconds ?? 0,
    },
    include: { device: { select: { id: true, hostname: true } } },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `alert_rule.create:${row.name}`);
  return NextResponse.json(row);
}
