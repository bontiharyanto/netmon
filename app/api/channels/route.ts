import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { CHANNEL_CATALOG } from "@/lib/channels";
import { ensureChannelCatalog, maskConfig, mergeConfig } from "@/lib/channel-store";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  try {
    const gate = await requirePermission("channels.manage");
    if (gate.error || !gate.session) return gate.error;

    await ensureChannelCatalog(gate.session.user.tenantId);
    const rows = await prisma.notify_channel.findMany({
      where: { tenant_id: gate.session.user.tenantId },
      orderBy: { name: "asc" },
    });

    const items = CHANNEL_CATALOG.map((kind) => {
      const row = rows.find((r) => r.type === kind.type);
      return {
        ...kind,
        id: row?.id,
        enabled: row?.enabled ?? false,
        severities: (row?.severities ?? "critical,warning").split(",").filter(Boolean),
        config: maskConfig(row?.config ?? {}),
        last_tested_at: row?.last_tested_at?.toISOString() ?? null,
        last_status: row?.last_status ?? null,
      };
    });

    return NextResponse.json({ items, canWrite: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load channels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requirePermission("channels.manage");
  if (gate.error || !gate.session) return gate.error;

  const body = await req.json();
  const type = String(body.type ?? "");
  const kind = CHANNEL_CATALOG.find((c) => c.type === type);
  if (!kind) return NextResponse.json({ error: "Unknown channel" }, { status: 400 });

  await ensureChannelCatalog(gate.session.user.tenantId);
  const existing = await prisma.notify_channel.findUnique({
    where: { tenant_id_type: { tenant_id: gate.session.user.tenantId, type } },
  });
  if (!existing) return NextResponse.json({ error: "Channel missing" }, { status: 404 });

  const config = body.config ? mergeConfig(existing.config, body.config) : existing.config;
  const severities = Array.isArray(body.severities)
    ? body.severities.join(",")
    : existing.severities;

  const updated = await prisma.notify_channel.update({
    where: { id: existing.id },
    data: {
      config: config as Prisma.InputJsonValue,
      severities,
      enabled: typeof body.enabled === "boolean" ? body.enabled : existing.enabled,
    },
  });

  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `channel.update:${type}`);
  return NextResponse.json({
    id: updated.id,
    enabled: updated.enabled,
    last_status: updated.last_status,
  });
}
