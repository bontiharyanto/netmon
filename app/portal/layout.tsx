import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getAuthSession } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur">
        <Logo />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          Customer portal · {session.user.tenantSlug}
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
