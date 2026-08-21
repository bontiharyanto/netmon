"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { IdleSessionGuard } from "@/components/layout/idle-session-guard";

export function AppShell({
  children,
  email,
  role,
  tenantSlug,
  idleMinutes,
}: {
  children: React.ReactNode;
  email?: string | null;
  role?: string;
  tenantSlug?: string;
  idleMinutes?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen">
      <IdleSessionGuard minutes={idleMinutes} />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header email={email} role={role} tenantSlug={tenantSlug} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
