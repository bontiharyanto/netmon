import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { MaintenanceManager } from "@/components/alerts/maintenance-manager";

export default async function MaintenancePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "alert.read", session.user.permissions)) redirect("/dashboard");

  return (
    <MaintenanceManager canWrite={hasPermission(session.user.role, "alert.write", session.user.permissions)} />
  );
}
