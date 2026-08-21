import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (session.user.role === "viewer") redirect("/portal");

  return (
    <AppShell email={session.user.email} role={session.user.role} tenantSlug={session.user.tenantSlug}>
      {children}
    </AppShell>
  );
}
