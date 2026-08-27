import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    scope: z.enum(["all", "devices", "types"]).optional(),
    scope_config: z.record(z.unknown()).optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().optional(),
    suppress_alert: z.boolean().optional(),
    suppress_notify: z.boolean().optional(),
    suppress_ticket: z.boolean().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.starts_at && data.ends_at && new Date(data.ends_at) <= new Date(data.starts_at)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ends_at must be after starts_at", path: ["ends_at"] });
    }
  });

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.maintenance_window.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const starts = parsed.data.starts_at ? new Date(parsed.data.starts_at) : existing.starts_at;
  const ends = parsed.data.ends_at ? new Date(parsed.data.ends_at) : existing.ends_at;
  if (ends <= starts) return NextResponse.json({ error: "ends_at must be after starts_at" }, { status: 400 });

  const row = await prisma.maintenance_window.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim(),
      scope: parsed.data.scope,
      scope_config:
        parsed.data.scope_config === undefined
          ? undefined
          : (parsed.data.scope_config as Prisma.InputJsonValue),
      starts_at: parsed.data.starts_at ? starts : undefined,
      ends_at: parsed.data.ends_at ? ends : undefined,
      suppress_alert: parsed.data.suppress_alert,
      suppress_notify: parsed.data.suppress_notify,
      suppress_ticket: parsed.data.suppress_ticket,
      note: parsed.data.note === undefined ? undefined : parsed.data.note?.trim() || null,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `maintenance.update:${row.name}`);
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.maintenance_window.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.maintenance_window.delete({ where: { id: existing.id } });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `maintenance.delete:${existing.name}`);
  return NextResponse.json({ ok: true });
}
