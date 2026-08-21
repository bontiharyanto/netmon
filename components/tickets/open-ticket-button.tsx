"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Connector = { id: string; name: string; provider: string };

export function OpenTicketButton({ alertId }: { alertId: string }) {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/tickets/connectors/available")
      .then((res) => res.json())
      .then((data) => setConnectors(data.connectors ?? []))
      .catch(() => undefined);
  }, []);

  if (connectors.length === 0) return null;

  async function openTicket(connectorId: string) {
    setPending(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alertId, connector_id: connectorId }),
    });
    const data = await res.json();
    setPending(false);
    setOpen(false);
    if (!res.ok) {
      toast.error(data.error ?? "Unable to open ticket");
      return;
    }
    toast.success(data.ticket?.external_id ? `Ticket ${data.ticket.external_id}` : "Ticket opened");
  }

  return (
    <div className="relative">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen((v) => !v)}>
        Open ticket
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-md border border-border bg-card p-1 shadow-lg">
          {connectors.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => openTicket(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
