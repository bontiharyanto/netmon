import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  from_ci_id: z.string().min(1),
  to_ci_id: z.string().min(1),
  relation_type: z.enum(["runs_on", "depends_on", "connects_to", "hosts", "backed_by"]),
});

export async function GET() {
  const gate = await requirePermission("cmdb.read");
  if (gate.error || !gate.session) return gate.error;

  const rows = await prisma.cmdb_relation.findMany({
    where: { tenant_id: gate.session.user.tenantId },
    include: {
      from_ci: { select: { id: true, name: true, ci_type: true } },
      to_ci: { select: { id: true, name: true, ci_type: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const gate = await requirePermission("cmdb.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  if (parsed.data.from_ci_id === parsed.data.to_ci_id) {
    return NextResponse.json({ error: "Cannot relate a CI to itself" }, { status: 400 });
  }

  const [from, to] = await Promise.all([
    prisma.cmdb_ci.findFirst({ where: { id: parsed.data.from_ci_id, tenant_id: gate.session.user.tenantId } }),
    prisma.cmdb_ci.findFirst({ where: { id: parsed.data.to_ci_id, tenant_id: gate.session.user.tenantId } }),
  ]);
  if (!from || !to) return NextResponse.json({ error: "CI not found" }, { status: 400 });

  try {
    const row = await prisma.cmdb_relation.create({
      data: {
        tenant_id: gate.session.user.tenantId,
        from_ci_id: from.id,
        to_ci_id: to.id,
        relation_type: parsed.data.relation_type,
      },
      include: {
        from_ci: { select: { id: true, name: true, ci_type: true } },
        to_ci: { select: { id: true, name: true, ci_type: true } },
      },
    });
    await writeAudit(
      gate.session.user.tenantId,
      gate.session.user.id,
      `cmdb.relate:${from.name}->${to.name}:${parsed.data.relation_type}`,
    );
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Relation already exists" }, { status: 409 });
  }
}
