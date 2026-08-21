import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/roles";
import { detectMassOutage, resolveTicker, sanitizeTickerText } from "@/lib/outage";
import { getDictionary, parseLocale, formatTemplate, LOCALE_COOKIE } from "@/lib/i18n";
import { cookies } from "next/headers";

async function loadOutage(tenantId: string) {
  const [total, down, degraded, firing, critical, tenant] = await Promise.all([
    prisma.device.count({ where: { tenant_id: tenantId } }),
    prisma.device.count({ where: { tenant_id: tenantId, status: "down" } }),
    prisma.device.count({ where: { tenant_id: tenantId, status: "degraded" } }),
    prisma.alert.count({ where: { tenant_id: tenantId, status: "firing" } }),
    prisma.alert.count({ where: { tenant_id: tenantId, status: "firing", severity: "critical" } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ticker_text: true, ticker_enabled: true },
    }),
  ]);
  const outage = detectMassOutage({ total, down, degraded, firing, critical });
  const locale = parseLocale(cookies().get(LOCALE_COOKIE)?.value);
  const t = getDictionary(locale);
  const autoText = formatTemplate(t.outage.ticker, {
    down,
    total,
    alerts: firing,
  });
  const ticker = resolveTicker({
    outage,
    custom: tenant?.ticker_text ?? "",
    enabled: Boolean(tenant?.ticker_enabled),
    autoText,
  });
  return { outage, ticker, kpis: { total, down, degraded, firing, critical } };
}

export async function GET() {
  const gate = await requirePermission("alert.read");
  if (gate.error || !gate.session) return gate.error;
  const payload = await loadOutage(gate.session.user.tenantId);
  return NextResponse.json({
    ...payload,
    canEdit: hasPermission(gate.session.user.role, "alert.write"),
  });
}

export async function PATCH(req: Request) {
  const gate = await requirePermission("alert.write");
  if (gate.error || !gate.session) return gate.error;
  const body = await req.json().catch(() => ({}));
  const ticker_text = sanitizeTickerText(body.text ?? body.ticker_text);
  const ticker_enabled = Boolean(body.enabled ?? body.ticker_enabled);
  await prisma.tenant.update({
    where: { id: gate.session.user.tenantId },
    data: { ticker_text, ticker_enabled },
  });
  await writeAudit(
    gate.session.user.tenantId,
    gate.session.user.id,
    `ticker:${ticker_enabled ? "on" : "off"}`,
  );
  const payload = await loadOutage(gate.session.user.tenantId);
  return NextResponse.json({
    ...payload,
    canEdit: true,
  });
}
