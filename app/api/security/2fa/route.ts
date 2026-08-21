import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function POST() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totp_secret: secret, totp_enabled: false },
  });

  const otpauth = authenticator.keyuri(session.user.email ?? "user", "NETMON", secret);
  const qr = await QRCode.toDataURL(otpauth);
  return NextResponse.json({ secret, qr });
}
