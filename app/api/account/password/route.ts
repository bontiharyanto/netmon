import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(8).max(128),
});

export async function PATCH(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, tenant_id: session.user.tenantId },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await bcrypt.compare(parsed.data.current, user.password_hash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  if (parsed.data.current === parsed.data.next) {
    return NextResponse.json({ error: "Choose a different password." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: await bcrypt.hash(parsed.data.next, 10) },
  });
  await writeAudit(session.user.tenantId, session.user.id, "user.password");
  return NextResponse.json({ ok: true });
}
