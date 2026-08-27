import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { normalizeCityInput } from "@/lib/geo/indonesia-cities";
import { parseDeviceChecks } from "@/lib/device-checks";

const httpCheckSchema = z.object({
  url: z.string().url(),
  expectStatus: z.number().int().min(100).max(599).optional(),
});

const schema = z.object({
  city: z.string().max(80).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  type: z.string().min(1).max(40).optional(),
  checks: z
    .object({
      tcp: z.array(z.number().int().min(1).max(65535)).max(16).optional(),
      http: z.array(httpCheckSchema).max(8).optional(),
      icmp: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requirePermission("assets.write");
  if (gate.error || !gate.session) return gate.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const existing = await prisma.device.findFirst({
    where: { id: params.id, tenant_id: gate.session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    city?: string | null;
    location?: string | null;
    type?: string;
    checks?: ReturnType<typeof parseDeviceChecks>;
  } = {};
  if (parsed.data.city !== undefined) data.city = normalizeCityInput(parsed.data.city);
  if (parsed.data.location !== undefined) data.location = parsed.data.location?.trim() || null;
  if (parsed.data.type !== undefined) data.type = parsed.data.type.trim();
  if (parsed.data.checks !== undefined) {
    data.checks = parseDeviceChecks(parsed.data.checks, data.type ?? existing.type);
  }

  const device = await prisma.device.update({ where: { id: existing.id }, data });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `device.update:${device.hostname}`);
  return NextResponse.json(device);
}
