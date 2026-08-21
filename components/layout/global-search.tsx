"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const DESTINATIONS = [
  { q: "device", href: "/dashboard/devices" },
  { q: "alert", href: "/dashboard/alerts" },
  { q: "sla", href: "/dashboard/sla" },
  { q: "ticket", href: "/dashboard/tickets" },
  { q: "jira", href: "/dashboard/settings/tickets" },
  { q: "map", href: "/dashboard/topology" },
  { q: "import", href: "/dashboard/import" },
  { q: "report", href: "/dashboard/reports" },
  { q: "user", href: "/dashboard/users" },
  { q: "agent", href: "/dashboard/agents" },
  { q: "channel", href: "/dashboard/settings" },
  { q: "settings", href: "/dashboard/settings" },
  { q: "slack", href: "/dashboard/settings" },
  { q: "insight", href: "/dashboard/ai" },
  { q: "ai", href: "/dashboard/settings/ai" },
  { q: "portal", href: "/portal" },
  { q: "admin", href: "/admin" },
];

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(
    () => DESTINATIONS.filter((item) => item.q.includes(query.toLowerCase())).slice(0, 6),
    [query],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) router.push(matches[0].href);
        }}
        placeholder="Search devices, alerts, modules… ⌘K"
        className="pl-9"
      />
      {open && query && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-card p-1 shadow-lg">
          {matches.map((item) => (
            <button
              key={item.href}
              className="flex w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={() => router.push(item.href)}
            >
              {item.q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
