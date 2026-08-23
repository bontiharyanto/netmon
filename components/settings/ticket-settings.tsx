"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AUTO_TICKET_EVENTS, AUTO_TICKET_SEVERITIES, TICKET_DIRECTIONS, TICKET_PROVIDERS, type TicketProvider } from "@/lib/ticket-providers";
import { cn } from "@/lib/utils";

type Connector = {
  id: string;
  provider: string;
  provider_name: string;
  name: string;
  enabled: boolean;
  direction: "both" | "inbound" | "outbound";
  auto_open: boolean;
  severities: string[];
  events?: string[];
  base_url: string;
  api_user: string;
  api_key: string;
  has_key: boolean;
  config: Record<string, string>;
  inbound_url: string;
  last_status: string | null;
};

type Draft = {
  id?: string;
  provider: string;
  provider_name: string;
  name: string;
  enabled: boolean;
  direction: "both" | "inbound" | "outbound";
  auto_open: boolean;
  severities: string[];
  events?: string[];
  base_url: string;
  api_user: string;
  api_key: string;
  has_key?: boolean;
  config: Record<string, string>;
  inbound_url?: string;
  last_status?: string | null;
};

const EMPTY = (provider: TicketProvider): Draft => ({
  provider: provider.id,
  provider_name: provider.name,
  name: provider.name,
  enabled: provider.id === "netmon",
  direction: "both",
  auto_open: provider.id === "netmon",
  severities: ["critical", "warning"],
  events: ["*"],
  base_url: provider.id === "novacrm" ? provider.base_placeholder : "",
  api_user: "",
  api_key: "",
  has_key: false,
  config: {
    ...Object.fromEntries(provider.fields.map((field) => [field.key, ""])),
    ...(provider.id === "novacrm" ? { sync_cmdb: "true" } : {}),
  },
});

export function TicketSettings() {
  const [items, setItems] = useState<Connector[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const provider = useMemo(() => TICKET_PROVIDERS.find((p) => p.id === draft?.provider), [draft?.provider]);

  async function load() {
    const res = await fetch("/api/tickets/connectors");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Unable to load ticketing");
      return;
    }
    setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const res = await fetch("/api/tickets/connectors", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success("Ticketing connector saved");
    setDraft(data.item);
    load();
  }

  async function test() {
    if (!draft?.id) {
      toast.error("Save the connector first");
      return;
    }
    const res = await fetch("/api/tickets/connectors/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draft.id }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.status ?? "Test failed");
    else toast.success(data.status);
    load();
  }

  async function rotate() {
    if (!draft?.id) return;
    setSaving(true);
    const res = await fetch("/api/tickets/connectors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, rotate_token: true }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Rotate failed");
      return;
    }
    setDraft(data.item);
    toast.success("Inbound token rotated");
    load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading ticketing…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Administrator</p>
        <h1 className="mt-1 text-2xl font-semibold">Ticketing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Receive tickets from NovaCRM, Jira, ServiceNow, Zendesk, and others. Respond from NETMON, or open a ticket
          from an alert.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connectors</CardTitle>
          <CardDescription>One integration per ITSM. Enable after credentials work.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TICKET_PROVIDERS.map((item) => (
              <Button key={item.id} type="button" variant="outline" size="sm" onClick={() => setDraft(EMPTY(item))}>
                Add {item.name}
              </Button>
            ))}
          </div>
          {items.length === 0 && <p className="text-sm text-muted-foreground">No ticketing system connected yet.</p>}
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                  onClick={() => setDraft(item)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm",
                  draft && "id" in draft && draft.id === item.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span>
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-muted-foreground">{item.provider_name}</span>
                </span>
                {item.enabled ? <Badge variant="ok">Enabled</Badge> : <Badge variant="muted">Disabled</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {draft && provider && (
        <Card>
          <CardHeader>
            <CardTitle>{provider.name}</CardTitle>
            <CardDescription>{provider.blurb}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Display name">
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              {draft.provider !== "netmon" && (
                <>
                  <Field label="Base URL">
                    <Input
                      className="font-mono"
                      placeholder={provider.base_placeholder}
                      value={draft.base_url}
                      onChange={(e) => setDraft({ ...draft, base_url: e.target.value })}
                    />
                  </Field>
                  <Field label={provider.user_label}>
                    <Input value={draft.api_user} onChange={(e) => setDraft({ ...draft, api_user: e.target.value })} />
                  </Field>
                  <Field label={provider.key_label}>
                    <Input
                      type="password"
                      placeholder={draft.has_key ? "••••••••" : ""}
                      value={draft.api_key}
                      onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                    />
                  </Field>
                </>
              )}
              {draft.provider === "novacrm" && (
                <p className="md:col-span-2 text-xs text-muted-foreground">
                  Tenant slug is the NovaCRM tenant (for example <span className="font-mono">novacrm-demo</span>).
                  Secret comes from NovaCRM → Settings → Integrations → webhook alerts. Minimum 16 characters.
                </p>
              )}
              {provider.fields.map((field) => (
                <Field key={field.key} label={field.label}>
                  <Input
                    placeholder={field.placeholder}
                    value={draft.config?.[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, config: { ...draft.config, [field.key]: e.target.value } })
                    }
                  />
                </Field>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {TICKET_DIRECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, direction: item.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    draft.direction === item.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Auto-ticket rules</Label>
              <p className="text-xs text-muted-foreground">
                Open a ticket only for firing alerts that match severity and event.
              </p>
              <div className="flex flex-wrap gap-2">
                {AUTO_TICKET_SEVERITIES.map((sev) => {
                  const on = draft.severities.includes(sev);
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          severities: on ? draft.severities.filter((s) => s !== sev) : [...draft.severities, sev],
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs capitalize",
                        on ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {AUTO_TICKET_EVENTS.map((item) => {
                  const selected = draft.events ?? ["*"];
                  const on = selected.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === "*") {
                          setDraft({ ...draft, events: ["*"] });
                          return;
                        }
                        const next = selected.filter((e) => e !== "*");
                        setDraft({
                          ...draft,
                          events: on ? next.filter((e) => e !== item.id) : [...next, item.id],
                        });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        on ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="accent-primary"
                checked={draft.auto_open}
                onChange={(e) => setDraft({ ...draft, auto_open: e.target.checked })}
              />
              Auto-open a ticket when a matching alert fires
            </label>
            {draft.provider === "novacrm" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={(draft.config.sync_cmdb ?? "true").toLowerCase() !== "false"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      config: { ...draft.config, sync_cmdb: e.target.checked ? "true" : "false" },
                    })
                  }
                />
                Sync CMDB to NovaCRM (create/update asset + CI; delete retires the asset)
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="accent-primary"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Enable connector
            </label>

            {"inbound_url" in draft && draft.inbound_url && (
              <div className="space-y-1.5">
                <Label>Inbound webhook (receive)</Label>
                <Input readOnly className="font-mono text-xs" value={draft.inbound_url} />
                <p className="text-xs text-muted-foreground">
                  {draft.provider === "novacrm"
                    ? "Paste this URL into a NovaCRM workflow webhook to send ticket updates back to NETMON."
                    : "Point Jira / ServiceNow / Zendesk webhooks here. NETMON accepts create, comment, and resolve events."}
                </p>
              </div>
            )}

            {"last_status" in draft && draft.last_status && (
              <p className="font-mono text-xs text-muted-foreground">Last test: {draft.last_status}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={test}>
                Test connection
              </Button>
              {"id" in draft && draft.id && (
                <Button variant="outline" onClick={rotate}>
                  Rotate inbound token
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
