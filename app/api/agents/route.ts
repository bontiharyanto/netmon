import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

const schema = z.object({ deviceId: z.string() });

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await prisma.agent.findMany({
    where: { tenant_id: session.user.tenantId },
    include: { device: { select: { hostname: true } } },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(agents);
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWrite(session.user.role, session.user.permissions)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const device = await prisma.device.findFirst({
    where: { id: parsed.data.deviceId, tenant_id: session.user.tenantId },
  });
  if (!device) return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });

  const agent = await prisma.agent.upsert({
    where: { device_id: device.id },
    update: { token: randomBytes(24).toString("hex"), status: "pending" },
    create: {
      tenant_id: session.user.tenantId,
      device_id: device.id,
      token: randomBytes(24).toString("hex"),
      status: "pending",
    },
    include: { device: { select: { hostname: true } } },
  });

  return NextResponse.json(agent);
}
