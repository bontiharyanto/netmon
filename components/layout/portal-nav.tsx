"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/layout/locale-provider";

const LINKS = [
  { href: "/portal", key: "overview" as const },
  { href: "/portal/help", key: "help" as const },
  { href: "/portal/assets", key: "assets" as const },
  { href: "/portal/cmdb", key: "cmdb" as const },
  { href: "/portal/topology", key: "topology" as const },
  { href: "/portal/tickets", key: "tickets" as const },
  { href: "/portal/knowledge", key: "knowledge" as const },
  { href: "/portal/ai", key: "ai" as const },
];

export function PortalNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || (link.href !== "/portal" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.portal[link.key]}
          </Link>
        );
      })}
    </nav>
  );
}
