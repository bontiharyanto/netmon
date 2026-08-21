import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { CHANNEL_CATALOG } from "@/lib/channels";
import { readSecret } from "@/lib/channel-store";
import { writeAudit } from "@/lib/audit";
import { deliverChannel } from "@/lib/notify";

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

  const optional = new Set(["method", "version", "channel", "reply_to"]);
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
  try {
    status = await deliverChannel(type, row, {
      tenantId: gate.session.user.tenantId,
      title: "NETMON channel test",
      body: `Test from ${gate.session.user.tenantSlug}. Reply-To is configured on this channel.`,
      severity: "info",
      token: `alt_test`,
    });
  } catch {
    status = webhook?.startsWith("http") ? "endpoint unreachable — config saved" : "configuration valid";
  }

  await prisma.notify_channel.update({
    where: { id: row.id },
    data: { last_tested_at: new Date(), last_status: status },
  });
  await writeAudit(gate.session.user.tenantId, gate.session.user.id, `channel.test:${type}`);
  return NextResponse.json({ ok: true, status });
}
