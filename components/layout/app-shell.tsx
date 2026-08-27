"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { IdleSessionGuard } from "@/components/layout/idle-session-guard";
import { PasswordReminder } from "@/components/layout/password-reminder";
import { MassOutageTicker } from "@/components/layout/mass-outage-ticker";

const SIDEBAR_KEY = "netmon_sidebar_collapsed";

export function AppShell({
  children,
  email,
  role,
  permissions,
  tenantSlug,
  tenantName,
  idleMinutes,
}: {
  children: React.ReactNode;
  email?: string | null;
  role?: string;
  permissions?: string[];
  tenantSlug?: string;
  tenantName?: string;
  idleMinutes?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // private mode
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "[" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  return (
    <div className="flex h-screen min-h-0">
      <IdleSessionGuard minutes={idleMinutes} />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        role={role}
        permissions={permissions}
        tenantSlug={tenantSlug}
        tenantName={tenantName}
        email={email}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 shrink-0 bg-background/80 backdrop-blur">
          <Header
            email={email}
            role={role}
            tenantSlug={tenantSlug}
            onOpenSidebar={() => setMobileOpen(true)}
          />
          <PasswordReminder />
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <MassOutageTicker placement="bottom" />
      </div>
    </div>
  );
}
