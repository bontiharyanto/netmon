"use client";

import Link from "next/link";
import { CircleHelp, Menu } from "lucide-react";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/layout/locale-provider";

export function Header({
  email,
  role,
  tenantSlug,
  onOpenSidebar,
}: {
  email?: string | null;
  role?: string;
  tenantSlug?: string;
  onOpenSidebar?: () => void;
}) {
  const { t } = useI18n();
  const helpHref = role === "viewer" ? "/portal/help" : "/dashboard/help";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      {onOpenSidebar && (
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          aria-expanded={false}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-3">
        {tenantSlug && (
          <span className="hidden font-mono text-[11px] text-muted-foreground lg:inline">
            {tenantSlug}.netmon.click
          </span>
        )}
        <div className="flex items-center gap-0.5">
          <LocaleToggle />
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link href={helpHref} aria-label={t.nav.help} title={t.nav.help}>
              <CircleHelp className="h-4 w-4" />
            </Link>
          </Button>
          <NotificationBell />
        </div>
        <UserMenu email={email} role={role} />
      </div>
    </header>
  );
}
