"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/settings", label: "Channels" },
  { href: "/dashboard/settings/tickets", label: "Ticketing" },
  { href: "/dashboard/settings/ai", label: "AI integration" },
];

export function SettingsNav() {
  const pathname = usePathname();
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
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
