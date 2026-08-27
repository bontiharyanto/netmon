import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { normalizeCityInput } from "@/lib/geo/indonesia-cities";
import { parseDeviceChecks } from "@/lib/device-checks";
import { publicDevice, resolveCommunityUpdate } from "@/lib/snmp-secrets";

const httpCheckSchema = z.object({
  url: z.string().url(),
  expectStatus: z.number().int().min(100).max(599).optional(),
});

const schema = z.object({
  city: z.string().max(80).nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  type: z.string().min(1).max(40).optional(),
  display_name: z.string().max(160).nullable().optional(),
  skip_poller_when_agent: z.boolean().optional(),
  checks: z
    .object({
      tcp: z.array(z.number().int().min(1).max(65535)).max(16).optional(),
      http: z.array(httpCheckSchema).max(8).optional(),
      icmp: z.boolean().optional(),
    })
    .optional(),
  snmp_enabled: z.boolean().optional(),
  snmp_version: z.enum(["v2c", "v3"]).nullable().optional(),
  snmp_community: z.string().max(120).nullable().optional(),
  snmp_port: z.number().int().min(1).max(65535).optional(),
  snmp_profile_id: z.string().nullable().optional(),
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

  if (parsed.data.snmp_profile_id) {
    const profile = await prisma.snmp_profile.findFirst({
      where: {
        id: parsed.data.snmp_profile_id,
        OR: [{ tenant_id: null }, { tenant_id: gate.session.user.tenantId }],
      },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ error: "SNMP profile not found" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.city !== undefined) data.city = normalizeCityInput(parsed.data.city);
  if (parsed.data.location !== undefined) data.location = parsed.data.location?.trim() || null;
  if (parsed.data.type !== undefined) data.type = parsed.data.type.trim();
  if (parsed.data.display_name !== undefined) data.display_name = parsed.data.display_name?.trim() || null;
  if (parsed.data.skip_poller_when_agent !== undefined) {
    data.skip_poller_when_agent = parsed.data.skip_poller_when_agent;
  }
  if (parsed.data.checks !== undefined) {
    data.checks = parseDeviceChecks(parsed.data.checks, (data.type as string) ?? existing.type);
  }
  if (parsed.data.snmp_enabled !== undefined) data.snmp_enabled = parsed.data.snmp_enabled;
  if (parsed.data.snmp_version !== undefined) data.snmp_version = parsed.data.snmp_version;
  if (parsed.data.snmp_port !== undefined) data.snmp_port = parsed.data.snmp_port;
  if (parsed.data.snmp_profile_id !== undefined) data.snmp_profile_id = parsed.data.snmp_profile_id;
  if (parsed.data.snmp_community !== undefined) {
    data.snmp_community = resolveCommunityUpdate(parsed.data.snmp_community, existing.snmp_community);
  }

  const device = await prisma.device.update({ where: { id: existing.id }, data });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `device.update:${device.hostname}`);
  return NextResponse.json(publicDevice(device as unknown as Record<string, unknown>));
}
