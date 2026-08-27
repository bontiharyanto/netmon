import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";

export default async function DashboardAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "platform.admin", session.user.permissions)) {
    redirect("/dashboard");
  }
  return children;
}
