import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["delete", "set_unknown"]),
});

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWrite(session.user.role, session.user.permissions)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const where = { id: { in: parsed.data.ids }, tenant_id: session.user.tenantId };

  if (parsed.data.action === "delete") {
    await prisma.device.deleteMany({ where });
  } else {
    await prisma.device.updateMany({ where, data: { status: "unknown" } });
  }

  await writeAudit(session.user.tenantId, session.user.id, `device.bulk:${parsed.data.action}:${parsed.data.ids.length}`);
  return NextResponse.json({ ok: true });
}
