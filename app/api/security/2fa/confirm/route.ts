import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

const schema = z.object({ token: z.string().min(6) });

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totp_secret) return NextResponse.json({ error: "Secret belum dibuat" }, { status: 400 });
  if (!authenticator.check(parsed.data.token, user.totp_secret)) {
    return NextResponse.json({ error: "Kode salah" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { totp_enabled: true } });
  return NextResponse.json({ ok: true });
}
