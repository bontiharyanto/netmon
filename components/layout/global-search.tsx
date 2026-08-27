"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/layout/locale-provider";
import { searchHelp } from "@/lib/help";

const MODULES = [
  { q: "help bantuan", href: "/dashboard/help", portal: "/portal/help", label: { en: "Help", id: "Bantuan" } },
  { q: "device inventory", href: "/dashboard/devices", portal: "/portal/assets", label: { en: "Inventory", id: "Inventaris" } },
  { q: "cctv nvr camera hikvision dahua", href: "/dashboard/devices", portal: "/portal/assets", label: { en: "CCTV / NVR", id: "CCTV / NVR" } },
  { q: "alert", href: "/dashboard/alerts", portal: "/portal", label: { en: "Alerts", id: "Alert" } },
  { q: "sla", href: "/dashboard/sla", portal: "/portal", label: { en: "SLA", id: "SLA" } },
  { q: "ticket novacrm", href: "/dashboard/tickets", portal: "/portal/tickets", label: { en: "Tickets", id: "Tiket" } },
  { q: "topology map", href: "/dashboard/topology", portal: "/portal/topology", label: { en: "Topology", id: "Topologi" } },
  { q: "map indonesia kota city peta", href: "/dashboard/map", portal: "/portal/map", label: { en: "Site map", id: "Peta situs" } },
  { q: "report pdf excel tanggal period", href: "/dashboard/reports", portal: "/portal/help", label: { en: "Reports", id: "Laporan" } },
  { q: "import", href: "/dashboard/import", portal: "/portal/help", label: { en: "Import", id: "Impor" } },
  { q: "agent token heartbeat", href: "/dashboard/agents", portal: "/portal/help", label: { en: "Agents", id: "Agen" } },
  { q: "channel slack email", href: "/dashboard/settings", portal: "/portal/help", label: { en: "Channels", id: "Kanal" } },
  { q: "knowledge kb", href: "/dashboard/knowledge", portal: "/portal/knowledge", label: { en: "Knowledge", id: "Pengetahuan" } },
] as const;

export function GlobalSearch() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { data } = useSession();
  const viewer = data?.user.role === "viewer";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const pages = MODULES.filter((item) => item.q.includes(q) || item.label.en.toLowerCase().includes(q) || item.label.id.toLowerCase().includes(q)).map(
      (item) => ({
        id: item.href,
        href: viewer ? item.portal : item.href,
        label: item.label[locale],
      }),
    );
    const help = searchHelp(q)
      .slice(0, 5)
      .map((article) => ({
        id: article.id,
        href: viewer ? "/portal/help" : `/dashboard/help?q=${encodeURIComponent(article.title[locale])}`,
        label: article.title[locale],
      }));
    const seen = new Set<string>();
    return [...pages, ...help]
      .filter((item) => {
        if (seen.has(item.href + item.label)) return false;
        seen.add(item.href + item.label);
        return true;
      })
      .slice(0, 8);
  }, [query, locale, viewer]);

  useEffect(() => {
    function focusSearch() {
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("netmon:open-search", focusSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("netmon:open-search", focusSearch);
    };
  }, []);

  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) router.push(matches[0].href);
        }}
        placeholder={t.search.placeholder}
        className="pl-9"
      />
      {open && query && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-card p-1 shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t.help.empty}</p>
          ) : (
            matches.map((item) => (
              <button
                key={item.id + item.href}
                className="flex w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={() => router.push(item.href)}
              >
                {item.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
