import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requirePermission("cmdb.write");
  if (gate.error || !gate.session) return gate.error;

  const existing = await prisma.cmdb_relation.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
    include: { from_ci: { select: { name: true } }, to_ci: { select: { name: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.cmdb_relation.delete({ where: { id: existing.id } });
  await writeAudit(
    gate.session.user.tenantId,
    gate.session.user.id,
    `cmdb.unrelate:${existing.from_ci.name}->${existing.to_ci.name}`,
  );
  return NextResponse.json({ ok: true });
}
