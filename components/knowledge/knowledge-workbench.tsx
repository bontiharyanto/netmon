"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/layout/locale-provider";
import { KB_CATEGORIES, type KbCategory } from "@/lib/knowledge";
import { cn } from "@/lib/utils";

type Article = {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  tags: string;
  published: boolean;
  updated_at: string;
};

const EMPTY: Article = {
  id: "",
  title: "",
  slug: "",
  body: "",
  category: "general",
  tags: "",
  published: true,
  updated_at: "",
};

export function KnowledgeWorkbench({ canWrite }: { canWrite: boolean }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/knowledge${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const data = await res.json();
    if (res.ok) setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryLabel = useMemo(
    () =>
      ({
        general: t.kb.categories.general,
        network: t.kb.categories.network,
        alert: t.kb.categories.alert,
        runbook: t.kb.categories.runbook,
        security: t.kb.categories.security,
      }) as Record<string, string>,
    [t],
  );

  async function save() {
    if (!draft) return;
    setSaving(true);
    const res = await fetch(draft.id ? `/api/knowledge/${draft.id}` : "/api/knowledge", {
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
    toast.success(t.kb.saved);
    setDraft(data.item);
    load();
  }

  async function remove() {
    if (!draft?.id) return;
    const res = await fetch(`/api/knowledge/${draft.id}`, { method: "DELETE" });
    if (!res.ok) return;
    toast.success(t.kb.deleted);
    setDraft(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.kb.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.kb.subtitle}</p>
        </div>
        {canWrite && (
          <Button onClick={() => setDraft({ ...EMPTY, title: "" })}>{t.kb.newArticle}</Button>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder={t.common.search}
        />
        <Button variant="outline" onClick={load}>
          {t.common.search}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">{t.kb.empty}</p>}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDraft(item)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm",
                draft?.id === item.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40",
              )}
            >
              <span>
                <span className="font-medium">{item.title}</span>
                <span className="ml-2 text-muted-foreground">{categoryLabel[item.category] ?? item.category}</span>
              </span>
              {item.published ? <Badge variant="ok">{t.common.published}</Badge> : <Badge variant="muted">{t.common.draft}</Badge>}
            </button>
          ))}
        </div>

        {draft && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="space-y-1.5">
                <Label>{t.kb.titleField}</Label>
                <Input
                  value={draft.title}
                  disabled={!canWrite}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.kb.category}</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={!canWrite}
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value as KbCategory })}
                >
                  {KB_CATEGORIES.map((id) => (
                    <option key={id} value={id}>
                      {categoryLabel[id]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.kb.body}</Label>
                <textarea
                  rows={12}
                  disabled={!canWrite}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.kb.tags}</Label>
                <Input
                  disabled={!canWrite}
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder="vpn, sla, core"
                />
              </div>
              {canWrite && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={draft.published}
                    onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                  />
                  {t.kb.publishedHint}
                </label>
              )}
              {canWrite && (
                <div className="flex gap-2">
                  <Button disabled={saving || draft.title.trim().length < 3} onClick={save}>
                    {saving ? t.common.loading : t.kb.save}
                  </Button>
                  {draft.id && (
                    <Button variant="outline" onClick={remove}>
                      {t.common.delete}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
