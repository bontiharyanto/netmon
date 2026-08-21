import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "channels.manage") && !hasPermission(session.user.role, "ai.manage")) {
    redirect("/dashboard");
  }

  return (
    <div>
      <SettingsNav />
      {children}
    </div>
  );
}
