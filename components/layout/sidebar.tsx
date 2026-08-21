"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Gauge,
  GitFork,
  LayoutDashboard,
  Shield,
  Upload,
  Users,
  FileText,
  Bot,
  PanelsTopLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/devices", label: "Devices", icon: Activity },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/dashboard/sla", label: "SLA", icon: Gauge },
  { href: "/dashboard/topology", label: "Topology", icon: GitFork },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/dashboards", label: "Builder", icon: PanelsTopLeft },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/security", label: "Security", icon: Shield },
];

export function Sidebar({
  collapsed,
  onToggle,
  showAdmin,
}: {
  collapsed: boolean;
  onToggle: () => void;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card/70 backdrop-blur"
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Logo compact={collapsed} />
        <button onClick={onToggle} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        {showAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              pathname.startsWith("/admin")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Superadmin</span>}
          </Link>
        )}
      </nav>
    </motion.aside>
  );
}
