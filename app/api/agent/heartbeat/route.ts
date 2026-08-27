import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string(),
  cpu_percent: z.number().min(0).max(100),
  ram_percent: z.number().min(0).max(100),
  disk_percent: z.number().min(0).max(100),
  version: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const agent = await prisma.agent.findUnique({
    where: { token: parsed.data.token },
    include: { device: true },
  });
  if (!agent) {
    return NextResponse.json(
      {
        error: "Unknown agent",
        hint: "Use the hex token from /dashboard/agents (Copy install command). TOKEN_DARI_KARTU is only an example.",
      },
      { status: 401 },
    );
  }

  await prisma.$transaction([
    prisma.agent.update({
      where: { id: agent.id },
      data: { last_seen: new Date(), status: "online", version: parsed.data.version ?? agent.version },
    }),
    prisma.device.update({
      where: { id: agent.device_id },
      data: { status: "up", last_seen: new Date() },
    }),
    prisma.metric.create({
      data: {
        device_id: agent.device_id,
        cpu_percent: parsed.data.cpu_percent,
        ram_percent: parsed.data.ram_percent,
        disk_percent: parsed.data.disk_percent,
      },
    }),
  ]);

  const firing = await prisma.alert.findMany({
    where: { device_id: agent.device_id, event: "device_down", status: "firing" },
    select: { id: true },
  });
  if (firing.length) {
    await prisma.alert.updateMany({
      where: { device_id: agent.device_id, event: "device_down", status: "firing" },
      data: { status: "resolved", resolved_at: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
