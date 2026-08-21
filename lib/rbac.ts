import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/roles";

export async function requirePermission(permission: Permission) {
  const session = await getAuthSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  if (!hasPermission(session.user.role, permission)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
