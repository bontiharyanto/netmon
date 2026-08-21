import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { TICKET_PROVIDERS, getTicketProvider, inboundWebhookUrl } from "@/lib/ticket-providers";
import { mergeConnectorKey, publicConnector } from "@/lib/ticket-remote";
import { newInboundToken, ensureLocalHelpdesk } from "@/lib/tickets";

const schema = z.object({
  id: z.string().optional(),
  provider: z.string(),
  name: z.string().min(2),
  enabled: z.boolean().optional(),
  direction: z.enum(["both", "inbound", "outbound"]).optional(),
  auto_open: z.boolean().optional(),
  severities: z.array(z.string()).optional(),
  base_url: z.string().optional(),
  api_user: z.string().optional(),
  api_key: z.string().optional(),
  config: z.record(z.string()).optional(),
  events: z.array(z.string()).optional(),
  rotate_token: z.boolean().optional(),
});

function withEvents(config: Record<string, string> | undefined, events?: string[]) {
  const next = { ...(config ?? {}) };
  if (events?.length) next.events = events.join(",");
  return next;
}

export async function GET() {
  try {
    const gate = await requirePermission("channels.manage");
    if (gate.error || !gate.session) return gate.error;
    await ensureLocalHelpdesk(gate.session.user.tenantId);
    const rows = await prisma.ticket_connector.findMany({
      where: { tenant_id: gate.session.user.tenantId },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json({
      providers: TICKET_PROVIDERS,
      items: rows.map((row) => publicConnector(row, inboundWebhookUrl(row.inbound_token))),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load connectors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requirePermission("channels.manage");
    if (gate.error || !gate.session) return gate.error;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const provider = getTicketProvider(parsed.data.provider);
    if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

    const row = await prisma.ticket_connector.create({
      data: {
        tenant_id: gate.session.user.tenantId,
        provider: provider.id,
        name: parsed.data.name,
        enabled: parsed.data.enabled ?? false,
        direction: parsed.data.direction ?? "both",
        auto_open: parsed.data.auto_open ?? provider.id === "netmon",
        severities: (parsed.data.severities ?? ["critical", "warning"]).join(","),
        base_url: parsed.data.base_url ?? "",
        api_user: parsed.data.api_user ?? "",
        api_key: mergeConnectorKey(null, parsed.data.api_key),
        config: withEvents(parsed.data.config, parsed.data.events),
        inbound_token: newInboundToken(),
      },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `ticket.connector.create:${provider.id}`);
    return NextResponse.json({ item: publicConnector(row, inboundWebhookUrl(row.inbound_token)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create connector";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requirePermission("channels.manage");
    if (gate.error || !gate.session) return gate.error;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success || !parsed.data.id) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const existing = await prisma.ticket_connector.findFirst({
      where: { id: parsed.data.id, tenant_id: gate.session.user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const row = await prisma.ticket_connector.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        enabled: parsed.data.enabled ?? existing.enabled,
        direction: parsed.data.direction ?? existing.direction,
        auto_open: parsed.data.auto_open ?? existing.auto_open,
        severities: parsed.data.severities ? parsed.data.severities.join(",") : existing.severities,
        base_url: parsed.data.base_url ?? existing.base_url,
        api_user: parsed.data.api_user ?? existing.api_user,
        api_key: mergeConnectorKey(existing.api_key, parsed.data.api_key),
        config: withEvents(
          parsed.data.config ?? ((existing.config as Record<string, string>) || {}),
          parsed.data.events,
        ),
        inbound_token: parsed.data.rotate_token ? newInboundToken() : existing.inbound_token,
      },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `ticket.connector.update:${row.provider}`);
    return NextResponse.json({ item: publicConnector(row, inboundWebhookUrl(row.inbound_token)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save connector";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requirePermission("channels.manage");
    if (gate.error || !gate.session) return gate.error;
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.ticket_connector.findFirst({
      where: { id, tenant_id: gate.session.user.tenantId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.ticket_connector.delete({ where: { id: existing.id } });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, `ticket.connector.delete:${existing.provider}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete connector";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
