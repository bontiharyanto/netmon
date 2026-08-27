"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  BookOpen,
  Building2,
  Layers,
  Database,
  FileText,
  Gauge,
  GitFork,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Lightbulb,
  PanelsTopLeft,
  PanelLeft,
  Search,
  Settings,
  Shield,
  Ticket,
  Upload,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { hasPermission, type Permission } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/layout/locale-provider";
import type { Dictionary } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: typeof LayoutDashboard;
  permission?: Permission;
};

type GroupKey = "monitor" | "assets" | "analyze";

const PRIMARY: { key: GroupKey; items: NavItem[] }[] = [
  {
    key: "monitor",
    items: [
      { href: "/dashboard", labelKey: "overview", icon: LayoutDashboard },
      { href: "/dashboard/alerts", labelKey: "alerts", icon: AlertTriangle, permission: "alert.read" },
      { href: "/dashboard/tickets", labelKey: "tickets", icon: Ticket, permission: "alert.read" },
      { href: "/dashboard/sla", labelKey: "sla", icon: Gauge, permission: "sla.read" },
      { href: "/dashboard/topology", labelKey: "topology", icon: GitFork, permission: "topology.read" },
      { href: "/dashboard/map", labelKey: "map", icon: MapPin, permission: "assets.read" },
    ],
  },
  {
    key: "assets",
    items: [
      { href: "/dashboard/devices", labelKey: "inventory", icon: Activity, permission: "assets.read" },
      { href: "/dashboard/floors", labelKey: "floors", icon: Layers, permission: "assets.read" },
      { href: "/dashboard/cmdb", labelKey: "cmdb", icon: Database, permission: "cmdb.read" },
      { href: "/dashboard/agents", labelKey: "agents", icon: Bot, permission: "agent.enroll" },
      { href: "/dashboard/import", labelKey: "import", icon: Upload, permission: "import.inventory" },
    ],
  },
  {
    key: "analyze",
    items: [
      { href: "/dashboard/ai", labelKey: "insights", icon: Lightbulb, permission: "ai.use" },
      { href: "/dashboard/knowledge", labelKey: "knowledge", icon: BookOpen, permission: "kb.read" },
      { href: "/dashboard/dashboards", labelKey: "boards", icon: PanelsTopLeft, permission: "dashboard.builder" },
      { href: "/dashboard/reports", labelKey: "reports", icon: FileText, permission: "reports.export" },
    ],
  },
];

const ADMIN: NavItem[] = [
  { href: "/dashboard/users", labelKey: "users", icon: Users, permission: "users.manage" },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
  { href: "/dashboard/security", labelKey: "security", icon: Shield, permission: "security.manage" },
  { href: "/dashboard/admin/permissions", labelKey: "capabilities", icon: KeyRound, permission: "platform.admin" },
  { href: "/admin", labelKey: "platform", icon: Building2, permission: "platform.admin" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/settings") return pathname.startsWith("/dashboard/settings");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(email?: string | null) {
  const local = email?.split("@")[0]?.trim() ?? "";
  if (!local) return "N";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function openSearch() {
  window.dispatchEvent(new Event("netmon:open-search"));
}

function NavLink({
  item,
  collapsed,
  pathname,
  label,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  label: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center rounded-md text-[13px] outline-none transition-colors duration-200",
        "focus-visible:ring-1 focus-visible:ring-ring",
        collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2 py-1.5",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <item.icon
        className={cn("h-[15px] w-[15px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
      />
      {!collapsed && <span className="min-w-0 truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  role,
  permissions,
  tenantSlug,
  tenantName,
  email,
  mobileOpen,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  role?: string;
  permissions?: string[];
  tenantSlug?: string;
  tenantName?: string;
  email?: string | null;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const can = (permission: Permission) => hasPermission(role, permission, permissions);
  const groups = PRIMARY.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((group) => group.items.length > 0);
  const adminItems = ADMIN.filter((item) => {
    if (item.href === "/dashboard/settings") {
      return can("channels.manage") || can("ai.manage");
    }
    return !item.permission || can(item.permission);
  });
  const workspace = tenantName || tenantSlug || "NETMON";
  const host = tenantSlug ? `${tenantSlug}.netmon.click` : null;

  return (
    <motion.aside
      animate={{ width: mobileOpen || !collapsed ? 240 : 64 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "z-40 flex h-screen shrink-0 flex-col border-r border-border bg-card",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:shadow-xl max-md:transition-transform max-md:duration-200 max-md:ease-out",
        "md:sticky md:top-0",
        !mobileOpen && "max-md:-translate-x-full max-md:shadow-none",
        mobileOpen && "max-md:translate-x-0",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-border", collapsed ? "justify-center px-0" : "px-3")}>
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0">
          <Logo compact={collapsed} pulse={false} />
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={t.common.collapse}
            title={`${t.common.collapse} ([)`}
            className="ml-auto hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="border-b border-border px-3 py-2.5">
          <p className="truncate text-[13px] font-medium text-foreground">{workspace}</p>
          {host && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{host}</p>}
        </div>
      )}

      <div className={cn("px-2 pt-2", collapsed && "px-1.5")}>
        <button
          type="button"
          onClick={openSearch}
          title={t.common.search}
          className={cn(
            "flex w-full items-center rounded-md border border-border/80 bg-background/60 text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground",
            collapsed ? "justify-center py-2" : "gap-2 px-2 py-1.5",
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{t.common.search}</span>
              <kbd className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground/80">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, index) => (
          <div key={group.key} className={cn(index > 0 && "mt-4")}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/65">
                {t.nav[group.key]}
              </p>
            )}
            {collapsed && index > 0 && <div className="mx-auto mb-2 h-px w-4 bg-border" />}
            <div className="space-y-px">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  label={t.nav[item.labelKey]}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {adminItems.length > 0 && (
        <div className="border-t border-border px-2 py-2">
          {!collapsed && (
            <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/65">
              {t.nav.admin}
            </p>
          )}
          <div className="space-y-px">
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
                label={t.nav[item.labelKey]}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto border-t border-border p-2">
        <div
          className={cn(
            "mb-1 flex items-center rounded-md",
            collapsed ? "justify-center py-1" : "gap-2 px-1.5 py-1",
          )}
          title={email ?? undefined}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-medium text-foreground">
            {initials(email)}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[11px] text-foreground">{email}</span>
              <span className="block truncate text-[10px] uppercase tracking-wide text-muted-foreground">{role}</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "hidden w-full items-center rounded-md text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground md:flex",
            collapsed ? "justify-center py-2" : "justify-between gap-2 px-2 py-1.5",
          )}
        >
          <span className="flex items-center gap-2">
            <PanelLeft className="h-3.5 w-3.5" />
            {!collapsed && t.common.collapse}
          </span>
          {!collapsed && (
            <kbd className="rounded border border-border px-1 font-mono text-[10px] text-muted-foreground/80">[</kbd>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
