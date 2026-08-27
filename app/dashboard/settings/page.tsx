import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { ChannelSettings } from "@/components/settings/channel-settings";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, "channels.manage", session.user.permissions)) redirect("/dashboard");

  return <ChannelSettings />;
}
