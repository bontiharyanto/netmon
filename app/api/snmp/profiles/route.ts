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

const createSchema = z.object({
  name: z.string().min(1).max(120),
  oids: z.array(oidSchema).min(1).max(32),
});

export async function GET() {
  const gate = await requirePermission("assets.read");
  if (gate.error || !gate.session) return gate.error;

  const rows = await prisma.snmp_profile.findMany({
    where: {
      OR: [{ tenant_id: null }, { tenant_id: gate.session.user.tenantId }],
    },
    orderBy: [{ tenant_id: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      system: row.tenant_id == null,
      oids: parseSnmpOids(row.oids),
    })),
  );
}

export async function POST(req: Request) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const row = await prisma.snmp_profile.create({
    data: {
      tenant_id: gate.session.user.tenantId,
      name: parsed.data.name.trim(),
      oids: parsed.data.oids as unknown as Prisma.InputJsonValue,
    },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `snmp_profile.create:${row.name}`);
  return NextResponse.json({ ...row, system: false, oids: parseSnmpOids(row.oids) });
}
