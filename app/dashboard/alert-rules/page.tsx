import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { AlertRulesManager } from "@/components/alerts/alert-rules-manager";

export default async function AlertRulesPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "alert.read", session.user.permissions)) redirect("/dashboard");

  return (
    <AlertRulesManager canWrite={hasPermission(session.user.role, "alert.write", session.user.permissions)} />
  );
}
