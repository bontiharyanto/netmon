import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canWrite } from "@/lib/roles";

const schema = z.object({ name: z.string().min(2) });

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boards = await prisma.dashboard.findMany({
    where: { tenant_id: session.user.tenantId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWrite(session.user.role, session.user.permissions)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const board = await prisma.dashboard.create({
    data: {
      tenant_id: session.user.tenantId,
      name: parsed.data.name,
      layout: {
        widgets: [
          { id: "w1", type: "availability" },
          { id: "w2", type: "alerts" },
          { id: "w3", type: "cpu" },
        ],
      },
    },
  });
  return NextResponse.json(board);
}
