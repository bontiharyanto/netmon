"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/layout/locale-provider";
import { TICKER_MAX, type TickerState } from "@/lib/outage";
import { cn } from "@/lib/utils";

export function TickerEditorForm({
  custom,
  enabled,
  compact,
  onSaved,
}: {
  custom: string;
  enabled: boolean;
  compact?: boolean;
  onSaved: (next: TickerState) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(custom);
  const [always, setAlways] = useState(enabled);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const res = await fetch("/api/ops/outage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, enabled: always }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      toast.error(data.error ?? t.outage.saveFailed);
      return;
    }
    toast.success(t.outage.saved);
    if (data.ticker) onSaved(data.ticker as TickerState);
  }

  async function clear() {
    setText("");
    setAlways(false);
    setPending(true);
    const res = await fetch("/api/ops/outage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "", enabled: false }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      toast.error(t.outage.saveFailed);
      return;
    }
    toast.success(t.outage.cleared);
    if (data.ticker) onSaved(data.ticker as TickerState);
  }

  return (
    <div className={cn("space-y-3", compact && "max-w-xl")}>
      <div className="space-y-1.5">
        <Label htmlFor="ticker-text">{t.outage.message}</Label>
        <textarea
          id="ticker-text"
          value={text}
          maxLength={TICKER_MAX}
          rows={compact ? 2 : 3}
          onChange={(event) => setText(event.target.value)}
          placeholder={t.outage.placeholder}
          className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">
          {text.length}/{TICKER_MAX}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={always}
          onChange={(event) => setAlways(event.target.checked)}
          className="accent-primary"
        />
        {t.outage.always}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void save()}>
          {pending ? t.common.loading : t.common.save}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void clear()}>
          {t.outage.clear}
        </Button>
      </div>
    </div>
  );
}
