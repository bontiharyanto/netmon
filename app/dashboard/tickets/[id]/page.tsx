import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasPermission } from "@/lib/roles";
import { TicketDetail } from "@/components/tickets/ticket-detail";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return <TicketDetail id={params.id} canRespond={hasPermission(session.user.role, "alert.write", session.user.permissions)} />;
}
