"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TickerEditorForm } from "@/components/layout/ticker-editor";
import { useI18n } from "@/components/layout/locale-provider";

export function TickerSettingsCard() {
  const { t } = useI18n();
  const [custom, setCustom] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/ops/outage")
      .then((res) => res.json())
      .then((data) => {
        setCustom(data.ticker?.custom ?? "");
        setEnabled(Boolean(data.ticker?.enabled));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.outage.title}</CardTitle>
        <CardDescription>{t.outage.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {ready ? (
          <TickerEditorForm
            key={`${custom}:${enabled}`}
            custom={custom}
            enabled={enabled}
            onSaved={(next) => {
              setCustom(next.custom);
              setEnabled(next.enabled);
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        )}
      </CardContent>
    </Card>
  );
}
