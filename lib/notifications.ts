import { prisma } from "@/lib/prisma";

export type NotifyKind = "alert" | "ticket" | "reply" | "system";

export async function pushNotification(opts: {
  tenantId: string;
  title: string;
  body: string;
  kind?: NotifyKind;
  refId?: string | null;
  severity?: string;
}) {
  const users = await prisma.user.findMany({
    where: { tenant_id: opts.tenantId },
    select: { id: true },
  });
  if (!users.length) return;
  try {
    await prisma.notification.createMany({
      data: users.map((user) => ({
        tenant_id: opts.tenantId,
        user_id: user.id,
        title: opts.title,
        body: opts.body,
        kind: opts.kind ?? "alert",
        ref_id: opts.refId ?? null,
        severity: opts.severity ?? "warning",
      })),
    });
  } catch {
    // table may not exist yet during migrate
  }
}

export function notificationHref(kind: string, refId: string | null | undefined, role?: string) {
  const portal = role === "viewer";
  if (kind === "ticket") return portal ? "/portal/tickets" : refId ? `/dashboard/tickets/${refId}` : "/dashboard/tickets";
  if (kind === "reply") return portal ? "/portal/tickets" : "/dashboard/tickets";
  return portal ? "/portal" : "/dashboard/alerts";
}
