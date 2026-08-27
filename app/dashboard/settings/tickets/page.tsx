import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { TicketSettings } from "@/components/settings/ticket-settings";

export default async function TicketingSettingsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "channels.manage", session.user.permissions)) redirect("/dashboard/settings");
  return <TicketSettings />;
}
