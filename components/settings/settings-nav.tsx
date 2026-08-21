"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/layout/locale-provider";

const TABS = [
  { href: "/dashboard/settings", key: "channels" as const },
  { href: "/dashboard/settings/tickets", key: "ticketing" as const },
  { href: "/dashboard/settings/ai", key: "ai" as const },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/dashboard/settings" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.settings[tab.key]}
          </Link>
        );
      })}
    </div>
  );
}
