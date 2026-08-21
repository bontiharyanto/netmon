"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_OPTIONS, type ChannelKind } from "@/lib/channels";
import { cn } from "@/lib/utils";

type ChannelItem = ChannelKind & {
  id?: string;
  enabled: boolean;
  severities: string[];
  config: Record<string, string>;
  last_tested_at: string | null;
  last_status: string | null;
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {} as { error?: string; items?: ChannelItem[]; status?: string };
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid server response" };
  }
}

export function ChannelSettings() {
  const [items, setItems] = useState<ChannelItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/channels");
      const data = await readJson(res);
      setLoading(false);
      if (!res.ok) {
        toast.error(data.error ?? "Unable to load channels");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setLoading(false);
      toast.error("Unable to load channels");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ChannelItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [items]);

  function updateLocal(type: string, patch: Partial<ChannelItem>) {
    setItems((prev) => prev.map((item) => (item.type === type ? { ...item, ...patch } : item)));
  }

  async function save(item: ChannelItem, extra?: Partial<{ enabled: boolean; severities: string[] }>) {
    setSaving(true);
    const res = await fetch("/api/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: item.type,
        config: item.config,
        enabled: extra?.enabled ?? item.enabled,
        severities: extra?.severities ?? item.severities,
      }),
    });
    const data = await readJson(res);
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    toast.success(`${item.name} saved`);
    updateLocal(item.type, { enabled: extra?.enabled ?? item.enabled });
  }

  async function test(type: string) {
    const res = await fetch("/api/channels/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      toast.error(data.status ?? data.error ?? "Test failed");
    } else {
      toast.success(data.status ?? "Test sent");
    }
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading channels…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Administrator</p>
          <h1 className="mt-1 text-2xl font-semibold">Notification channels</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure every delivery path for alerts. Each channel can set a Reply-To email so the NOC can answer from
            inbox. Secrets are encrypted at rest.
          </p>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground sm:flex">
          <Bell className="h-3.5 w-3.5" />
          {items.filter((i) => i.enabled).length} of {items.length} live
        </span>
      </div>

      {groups.map(([group, list]) => (
        <section key={group} className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{group}</h2>
          <div className="grid gap-3 xl:grid-cols-2">
            {list.map((item) => {
              const expanded = open === item.type;
              return (
                <Card key={item.type} className={cn(item.enabled && "border-primary/30")}>
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                    <div>
                      <CardTitle className="text-[15px]">{item.name}</CardTitle>
                      <CardDescription className="mt-1">{item.blurb}</CardDescription>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.enabled}
                      onClick={() => {
                        const enabled = !item.enabled;
                        updateLocal(item.type, { enabled });
                        save({ ...item, enabled }, { enabled });
                      }}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        item.enabled ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
                          item.enabled ? "left-[22px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.enabled ? <Badge variant="ok">On</Badge> : <Badge variant="muted">Off</Badge>}
                      {item.severities.map((sev) => (
                        <Badge key={sev} variant={sev === "critical" ? "crit" : sev === "warning" ? "warn" : "muted"}>
                          {sev}
                        </Badge>
                      ))}
                      {item.last_status && (
                        <span className="font-mono text-[11px] text-muted-foreground">{item.last_status}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setOpen(expanded ? null : item.type)}>
                        {expanded ? "Close" : "Configure"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => test(item.type)}>
                        Send test
                      </Button>
                    </div>
                    {expanded && (
                      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          {item.fields.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                              <Label htmlFor={`${item.type}-${field.key}`}>{field.label}</Label>
                              <Input
                                id={`${item.type}-${field.key}`}
                                type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                                placeholder={field.placeholder}
                                value={item.config[field.key] ?? ""}
                                onChange={(event) =>
                                  updateLocal(item.type, {
                                    config: { ...item.config, [field.key]: event.target.value },
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Route severities</Label>
                          <div className="flex flex-wrap gap-2">
                            {SEVERITY_OPTIONS.map((sev) => {
                              const on = item.severities.includes(sev);
                              return (
                                <button
                                  key={sev}
                                  type="button"
                                  onClick={() => {
                                    const severities = on
                                      ? item.severities.filter((s) => s !== sev)
                                      : [...item.severities, sev];
                                    updateLocal(item.type, { severities });
                                  }}
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
                        </div>
                        <Button disabled={saving} onClick={() => save(item)}>
                          {saving ? "Saving…" : "Save channel"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
