import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { TicketInbox } from "@/components/tickets/ticket-inbox";

export default async function TicketsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Inbound tickets from your ITSM and outbound tickets opened from NETMON alerts.
        </p>
      </div>
      <TicketInbox />
    </div>
  );
}
