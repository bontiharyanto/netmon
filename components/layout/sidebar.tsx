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
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Gauge,
  GitFork,
  CircleHelp,
  LayoutDashboard,
  Lightbulb,
  PanelsTopLeft,
  PanelLeft,
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
      { href: "/dashboard/help", labelKey: "help", icon: CircleHelp },
      { href: "/dashboard/alerts", labelKey: "alerts", icon: AlertTriangle, permission: "alert.read" },
      { href: "/dashboard/tickets", labelKey: "tickets", icon: Ticket, permission: "alert.read" },
      { href: "/dashboard/topology", labelKey: "topology", icon: GitFork, permission: "topology.read" },
      { href: "/dashboard/sla", labelKey: "sla", icon: Gauge, permission: "sla.read" },
    ],
  },
  {
    key: "assets",
    items: [
      { href: "/dashboard/devices", labelKey: "inventory", icon: Activity, permission: "assets.read" },
      { href: "/dashboard/cmdb", labelKey: "cmdb", icon: Database, permission: "cmdb.read" },
      { href: "/dashboard/import", labelKey: "import", icon: Upload, permission: "import.inventory" },
      { href: "/dashboard/agents", labelKey: "agents", icon: Bot, permission: "agent.enroll" },
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
  { href: "/admin", labelKey: "platform", icon: Building2, permission: "platform.admin" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/settings") return pathname.startsWith("/dashboard/settings");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  collapsed,
  pathname,
  label,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  label: string;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center rounded-md text-[13px] transition-colors duration-200",
        collapsed ? "justify-center py-2" : "gap-2.5 px-2.5 py-1.5",
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  role,
}: {
  collapsed: boolean;
  onToggle: () => void;
  role?: string;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const groups = PRIMARY.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);
  const adminItems = ADMIN.filter((item) => {
    if (item.href === "/dashboard/settings") {
      return hasPermission(role, "channels.manage") || hasPermission(role, "ai.manage");
    }
    return !item.permission || hasPermission(role, item.permission);
  });

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card"
    >
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center" : "justify-between px-3")}>
        <Logo compact={collapsed} pulse={false} />
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group, index) => (
          <div key={group.key} className={cn(index > 0 && "mt-5")}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                {t.nav[group.key]}
              </p>
            )}
            {collapsed && index > 0 && <div className="mx-auto mb-2 h-px w-5 bg-border" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  label={t.nav[item.labelKey]}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {adminItems.length > 0 && (
        <div className="border-t border-border px-2 py-2">
          {!collapsed && (
            <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              {t.nav.admin}
            </p>
          )}
          <div className="space-y-0.5">
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
                label={t.nav[item.labelKey]}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center rounded-md text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed ? "justify-center py-2" : "gap-2.5 px-2.5 py-1.5",
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && t.common.collapse}
        </button>
      </div>
    </motion.aside>
  );
}
