import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z
  .object({
    name: z.string().min(1).max(120),
    scope: z.enum(["all", "devices", "types"]),
    scope_config: z.record(z.unknown()).optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    suppress_alert: z.boolean().optional(),
    suppress_notify: z.boolean().optional(),
    suppress_ticket: z.boolean().optional(),
    note: z.string().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.ends_at) <= new Date(data.starts_at)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ends_at must be after starts_at", path: ["ends_at"] });
    }
  });

export async function GET(req: Request) {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;

  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const now = new Date();

  const rows = await prisma.maintenance_window.findMany({
    where: {
      tenant_id: gate.session.user.tenantId,
      ...(activeOnly ? { starts_at: { lte: now }, ends_at: { gt: now } } : {}),
    },
    orderBy: { starts_at: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const row = await prisma.maintenance_window.create({
    data: {
      tenant_id: gate.session.user.tenantId,
      name: parsed.data.name.trim(),
      scope: parsed.data.scope,
      scope_config: (parsed.data.scope_config ?? {}) as Prisma.InputJsonValue,
      starts_at: new Date(parsed.data.starts_at),
      ends_at: new Date(parsed.data.ends_at),
      suppress_alert: parsed.data.suppress_alert ?? true,
      suppress_notify: parsed.data.suppress_notify ?? true,
      suppress_ticket: parsed.data.suppress_ticket ?? true,
      note: parsed.data.note?.trim() || null,
      created_by: gate.session.user.id,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `maintenance.create:${row.name}`);
  return NextResponse.json(row);
}
