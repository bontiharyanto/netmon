import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PortalNav } from "@/components/layout/portal-nav";
import { PortalAccountLinks } from "@/components/layout/portal-account-links";
import { IdleSessionGuard } from "@/components/layout/idle-session-guard";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseIdleMinutes } from "@/lib/idle";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { idle_minutes: true },
  });

  return (
    <div className="min-h-screen">
      <IdleSessionGuard minutes={parseIdleMinutes(tenant?.idle_minutes)} />
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">
              {session.user.tenantSlug}
            </span>
            <LocaleToggle />
            <NotificationBell />
            <ThemeToggle />
            <PortalAccountLinks email={session.user.email} />
          </div>
        </div>
        <div className="px-4 pb-3">
          <PortalNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
