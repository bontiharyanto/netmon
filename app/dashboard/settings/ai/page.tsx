import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { AiIntegrationSettings } from "@/components/settings/ai-settings";

export default async function AiSettingsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "ai.manage", session.user.permissions)) redirect("/dashboard/settings");
  return <AiIntegrationSettings />;
}
