import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { notificationHref } from "@/lib/notifications";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ unread: 0, items: [] }, { status: 401 });

    const rows = await prisma.notification.findMany({
      where: { user_id: session.user.id, tenant_id: session.user.tenantId },
      orderBy: { created_at: "desc" },
      take: 30,
    });
    const unread = rows.filter((row) => !row.read_at).length;
    return NextResponse.json({
      unread,
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        kind: row.kind,
        severity: row.severity,
        read: Boolean(row.read_at),
        href: notificationHref(row.kind, row.ref_id, session.user.role),
        created_at: row.created_at.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ unread: 0, items: [] });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    await prisma.notification.updateMany({
      where: {
        user_id: session.user.id,
        tenant_id: session.user.tenantId,
        ...(ids.length ? { id: { in: ids } } : { read_at: null }),
      },
      data: { read_at: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
