"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

type Comment = { id: string; author: string; body: string; direction: string; created_at: string };
type Detail = {
  id: string;
  title: string;
  body: string;
  status: string;
  priority: string;
  direction: string;
  external_id: string;
  external_url: string | null;
  last_error: string | null;
  connector: { name: string; provider: string };
  alert: { id: string; event: string; device: { hostname: string; ip: string } } | null;
  comments: Comment[];
};

export function TicketDetail({ id, canRespond }: { id: string; canRespond: boolean }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Detail | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const res = await fetch(`/api/tickets/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Ticket not found");
      return;
    }
    setTicket(data.ticket);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function respond(close = false) {
    if (!body.trim()) return;
    setPending(true);
    const res = await fetch(`/api/tickets/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, close }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      toast.error(data.error ?? "Unable to respond");
      return;
    }
    setBody("");
    toast.success(close ? "Response sent and ticket resolved" : "Response sent");
    load();
    router.refresh();
  }

  if (!ticket) return <p className="text-sm text-muted-foreground">Loading ticket…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {ticket.connector.name} · {ticket.external_id || "local"} · {ticket.direction}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-muted-foreground">{ticket.body}</pre>
          {ticket.alert && (
            <p>
              Linked alert: {ticket.alert.event} on{" "}
              <span className="font-mono">{ticket.alert.device.hostname}</span>
            </p>
          )}
          {ticket.external_url && (
            <a className="text-primary hover:underline" href={ticket.external_url} target="_blank" rel="noreferrer">
              Open in ticketing system
            </a>
          )}
          {ticket.last_error && <p className="text-crit">Sync: {ticket.last_error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ticket.comments.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
          {ticket.comments.map((comment) => (
            <div key={comment.id} className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {comment.author} · {comment.direction} · {new Date(comment.created_at).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
            </div>
          ))}
          {canRespond && ticket.status !== "resolved" && (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                respond(false);
              }}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Respond to the ticketing system…"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Sending…" : "Send response"}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => respond(true)}>
                  Respond and resolve
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
