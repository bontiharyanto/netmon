import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { testAiConnection } from "@/lib/ai";
import { ensureAiSetting } from "@/lib/ai-config";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  mode: z.enum(["rules", "local", "cloud"]).optional(),
  provider: z.string().optional(),
  base_url: z.string().optional(),
  model: z.string().optional(),
  api_key: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const gate = await requirePermission("ai.manage");
    if (gate.error || !gate.session) return gate.error;
    await ensureAiSetting(gate.session.user.tenantId);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    const body = parsed.success ? parsed.data : {};
    const result = await testAiConnection(gate.session.user.tenantId, {
      mode: body.mode,
      provider: body.provider,
      baseUrl: body.base_url,
      model: body.model,
      apiKey: body.api_key,
    });
    await prisma.ai_setting.update({
      where: { tenant_id: gate.session.user.tenantId },
      data: { last_tested_at: new Date(), last_status: result.status },
    });
    await writeAudit(gate.session.user.tenantId, gate.session.user.id, "ai.settings.test");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI test failed";
    return NextResponse.json({ ok: false, status: message, models: [] }, { status: 500 });
  }
}
