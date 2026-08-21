import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PortalNav } from "@/components/layout/portal-nav";
import { getAuthSession } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            Customer portal · {session.user.tenantSlug}
            <ThemeToggle />
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
