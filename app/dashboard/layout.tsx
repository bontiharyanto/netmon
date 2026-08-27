import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIdleMinutes } from "@/lib/idle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (session.user.role === "viewer") redirect("/portal");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { idle_minutes: true, name: true },
  });

  return (
    <AppShell
      email={session.user.email}
      role={session.user.role}
      permissions={session.user.permissions}
      tenantSlug={session.user.tenantSlug}
      tenantName={tenant?.name}
      idleMinutes={parseIdleMinutes(tenant?.idle_minutes)}
    >
      {children}
    </AppShell>
  );
}
