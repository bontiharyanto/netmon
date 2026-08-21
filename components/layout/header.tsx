"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/layout/locale-provider";

export function Header({
  email,
  role,
  tenantSlug,
}: {
  email?: string | null;
  role?: string;
  tenantSlug?: string;
}) {
  const { t } = useI18n();
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur">
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <Link href="/portal" className="hidden text-xs text-muted-foreground hover:text-foreground md:inline">
          {t.common.portal}
        </Link>
        {tenantSlug && (
          <span className="hidden font-mono text-xs text-muted-foreground md:inline">
            {tenantSlug}.netmon.click
          </span>
        )}
        <LocaleToggle />
        <ThemeToggle />
        <NotificationBell />
        <Link
          href={role === "viewer" ? "/portal/account" : "/dashboard/account"}
          className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
        >
          {email}
        </Link>
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase">{role}</span>
        <Button variant="outline" size="sm" asChild>
          <Link href={role === "viewer" ? "/portal/account" : "/dashboard/account"}>{t.account.title}</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          {t.common.signOut}
        </Button>
      </div>
    </header>
  );
}
