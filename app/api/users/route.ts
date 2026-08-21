import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["admin", "operator", "viewer"]),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { tenant_id: session.user.tenantId },
    select: { id: true, email: true, name: true, role: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      tenant_id: session.user.tenantId,
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      role: parsed.data.role,
      password_hash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  await writeAudit(session.user.tenantId, session.user.id, `user.create:${user.email}`);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
