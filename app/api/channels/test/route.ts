import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { CHANNEL_CATALOG } from "@/lib/channels";
import { readSecret } from "@/lib/channel-store";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const gate = await requirePermission("channels.manage");
  if (gate.error || !gate.session) return gate.error;

  const { type } = await req.json();
  const kind = CHANNEL_CATALOG.find((c) => c.type === type);
  if (!kind) return NextResponse.json({ error: "Unknown channel" }, { status: 400 });

  const row = await prisma.notify_channel.findUnique({
    where: { tenant_id_type: { tenant_id: gate.session.user.tenantId, type } },
  });
  if (!row) return NextResponse.json({ error: "Save the channel first" }, { status: 400 });

  const optional = new Set(["method", "version", "channel"]);
  const empty = kind.fields.filter((field) => !optional.has(field.key) && !readSecret(row.config, field.key));
  if (empty.length) {
    const status = `missing ${empty[0].label}`;
    await prisma.notify_channel.update({
      where: { id: row.id },
      data: { last_tested_at: new Date(), last_status: status },
    });
    return NextResponse.json({ ok: false, status }, { status: 400 });
  }

  const webhook = readSecret(row.config, "webhook_url") || readSecret(row.config, "url");
  let status = "configuration valid";
  if (webhook?.startsWith("http")) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(webhook, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "NETMON",
          event: "channel_test",
          tenant: gate.session.user.tenantSlug,
          severity: "info",
          message: "NETMON channel test",
        }),
      });
      clearTimeout(timer);
      status = res.ok ? `delivered (${res.status})` : `remote ${res.status}`;
    } catch {
      status = "endpoint unreachable — config saved";
    }
  }

  await prisma.notify_channel.update({
    where: { id: row.id },
    data: { last_tested_at: new Date(), last_status: status },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `channel.test:${type}`);
  return NextResponse.json({ ok: true, status });
}
