import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/roles";
import { writeAudit } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "operator", "viewer"]).optional(),
  password: z.string().min(8).optional(),
});

async function gate() {
  const session = await getAuthSession();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  if (!canManageUsers(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

async function lastAdminBlocked(tenantId: string, targetId: string, nextRole?: string, deleting = false) {
  const target = await prisma.user.findFirst({ where: { id: targetId, tenant_id: tenantId } });
  if (!target) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }), target: null };
  if (target.role === "superadmin") {
    return { error: NextResponse.json({ error: "Platform users cannot be edited here" }, { status: 403 }), target: null };
  }
  const leavingAdmin = target.role === "admin" && (deleting || (nextRole && nextRole !== "admin"));
  if (leavingAdmin) {
    const admins = await prisma.user.count({ where: { tenant_id: tenantId, role: "admin" } });
    if (admins <= 1) {
      return { error: NextResponse.json({ error: "Keep at least one admin" }, { status: 409 }), target: null };
    }
  }
  return { error: null, target };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await gate();
  if (auth.error || !auth.session) return auth.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const blocked = await lastAdminBlocked(auth.session.user.tenantId, params.id, parsed.data.role);
  if (blocked.error || !blocked.target) return blocked.error;

  if (parsed.data.role && params.id === auth.session.user.id && parsed.data.role !== blocked.target.role) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 409 });
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    const clash = await prisma.user.findFirst({ where: { email, NOT: { id: params.id } }, select: { id: true } });
    if (clash) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id: blocked.target.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.password
        ? { password_hash: await bcrypt.hash(parsed.data.password, 10), password_changed_at: new Date() }
        : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });
  await writeAudit(auth.session.user.tenantId, auth.session.user.id, `user.update:${user.email}`);
  return NextResponse.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await gate();
  if (auth.error || !auth.session) return auth.error;

  if (params.id === auth.session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 409 });
  }

  const blocked = await lastAdminBlocked(auth.session.user.tenantId, params.id, undefined, true);
  if (blocked.error || !blocked.target) return blocked.error;

  await prisma.user.delete({ where: { id: blocked.target.id } });
  await writeAudit(auth.session.user.tenantId, auth.session.user.id, `user.delete:${blocked.target.email}`);
  return NextResponse.json({ ok: true });
}
