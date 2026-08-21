"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/components/layout/locale-provider";
import { TickerEditorForm } from "@/components/layout/ticker-editor";
import type { TickerState } from "@/lib/outage";

type Payload = {
  ticker?: TickerState;
  canEdit?: boolean;
};

export function MassOutageTicker() {
  const { t } = useI18n();
  const { data } = useSession();
  const [ticker, setTicker] = useState<TickerState | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const editingRef = useRef(false);
  editingRef.current = editing;
  const alertsHref = data?.user.role === "viewer" ? "/portal" : "/dashboard/alerts";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (editingRef.current) return;
      const res = await fetch("/api/ops/outage", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const payload = (await res.json()) as Payload;
      if (cancelled) return;
      setTicker(
        payload.ticker ?? {
          visible: false,
          text: "",
          custom: "",
          enabled: false,
          source: "auto",
        },
      );
      setCanEdit(Boolean(payload.canEdit));
      setLoaded(true);
    }

    load().catch(() => undefined);
    const timer = window.setInterval(() => load().catch(() => undefined), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const visible = Boolean(ticker?.visible && ticker.text);
  if (!loaded || (!visible && !canEdit)) return null;

  return (
    <div>
      {visible && ticker ? (
        <div className="flex items-center gap-3 border-b border-destructive/40 bg-destructive/10 px-3 py-1.5 text-destructive">
          <span className="shrink-0 rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide">
            {t.outage.badge}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="netmon-ticker flex w-max font-mono text-xs">
              <span className="pr-16">{ticker.text}</span>
              <span className="pr-16" aria-hidden="true">
                {ticker.text}
              </span>
            </div>
          </div>
          {canEdit && (
            <button
              type="button"
              className="shrink-0 text-[11px] font-medium hover:underline"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? t.common.cancel : t.outage.edit}
            </button>
          )}
          <Link href={alertsHref} className="shrink-0 text-[11px] font-medium hover:underline">
            {t.outage.open}
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-end border-b border-border px-3 py-1">
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? t.common.cancel : t.outage.announce}
          </button>
        </div>
      )}
      {editing && canEdit && ticker && (
        <div className="border-b border-border bg-muted/20 px-3 py-3">
          <TickerEditorForm
            key={`${ticker.custom}:${ticker.enabled}`}
            custom={ticker.custom}
            enabled={ticker.enabled}
            compact
            onSaved={(next) => {
              setTicker(next);
              setEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
