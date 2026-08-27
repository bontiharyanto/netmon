import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import {
  capabilityMatrixPayload,
  resetCapabilityMatrix,
  saveCapabilityMatrix,
} from "@/lib/capabilities";
import { requirePermission } from "@/lib/rbac";
import { PERMISSIONS, ROLES, type Permission, type RoleMatrix } from "@/lib/roles";

const matrixSchema = z.object({
  matrix: z.record(z.string(), z.array(z.string())),
});

function parseMatrix(raw: Record<string, string[]>): RoleMatrix | null {
  const matrix = {} as RoleMatrix;
  for (const role of ROLES) {
    const list = raw[role];
    if (!Array.isArray(list)) return null;
    matrix[role] = list.filter((p): p is Permission =>
      PERMISSIONS.includes(p as Permission),
    );
  }
  return matrix;
}

export async function GET() {
  const gate = await requirePermission("platform.admin");
  if (gate.error || !gate.session) return gate.error;
  return NextResponse.json(await capabilityMatrixPayload());
}

export async function PUT(req: Request) {
  const gate = await requirePermission("platform.admin");
  if (gate.error || !gate.session) return gate.error;

  const body = matrixSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid matrix payload" }, { status: 400 });
  }

  const parsed = parseMatrix(body.data.matrix);
  if (!parsed) {
    return NextResponse.json({ error: "Matrix must include all roles" }, { status: 400 });
  }

  const matrix = await saveCapabilityMatrix(parsed);
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, "capabilities.update");
  const payload = await capabilityMatrixPayload();
  return NextResponse.json({ ok: true, ...payload, matrix });
}

export async function POST(req: Request) {
  const gate = await requirePermission("platform.admin");
  if (gate.error || !gate.session) return gate.error;

  const body = z
    .object({ action: z.enum(["reset"]) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const matrix = await resetCapabilityMatrix();
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, "capabilities.reset");
  const payload = await capabilityMatrixPayload();
  return NextResponse.json({ ok: true, ...payload, matrix });
}
