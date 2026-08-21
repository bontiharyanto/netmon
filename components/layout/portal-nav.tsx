"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/assets", label: "Assets" },
  { href: "/portal/cmdb", label: "CMDB" },
  { href: "/portal/topology", label: "Topology" },
  { href: "/portal/tickets", label: "Tickets" },
  { href: "/portal/ai", label: "AI" },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
