import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { roleAllows } from "@/lib/capabilities";
import type { Permission } from "@/lib/roles";

export async function requirePermission(permission: Permission) {
  const session = await getAuthSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  const allowed = await roleAllows(session.user.role, permission);
  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
