"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";

type TicketRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  direction: string;
  external_id: string;
  last_error: string | null;
  updated_at: string;
  connector: { name: string; provider: string };
};

export function TicketInbox() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => {
        setTickets(data.tickets ?? []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Unable to load tickets");
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading tickets…</p>;

  return (
    <div className="space-y-3">
      {tickets.length === 0 && (
        <p className="text-sm text-muted-foreground">No tickets yet. Open one from an alert, or receive a webhook.</p>
      )}
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          type="button"
          onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
          className="flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-3 text-left hover:bg-muted/70"
        >
          <div>
            <p className="font-medium">{ticket.title}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {ticket.connector.name} · {ticket.external_id || "local"} · {ticket.direction}
              {ticket.last_error ? ` · ${ticket.last_error}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </button>
      ))}
    </div>
  );
}
