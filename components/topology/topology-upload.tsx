"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/layout/locale-provider";

export function TopologyUpload() {
  const { t } = useI18n();
  const router = useRouter();
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const replace = form.elements.namedItem("replace") as HTMLInputElement;
    data.set("replace", replace?.checked ? "true" : "false");

    try {
      const res = await fetch("/api/topology/import", { method: "POST", body: data });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        toast.error(json.error ?? t.topology.uploadFailed);
        return;
      }
      const extra = json.missing?.length ? ` ${t.topology.missing}: ${json.missing.join(", ")}` : "";
      setResult(`${json.imported} ${t.topology.saved} · ${json.skipped} ${t.topology.skipped}.${extra}`);
      toast.success(t.topology.uploaded);
      router.refresh();
    } catch {
      toast.error(t.topology.uploadFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.topology.uploadTitle}</CardTitle>
        <CardDescription>{t.topology.uploadHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="file" type="file" accept=".csv,.xlsx,.xls,.json" required className="block text-sm" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="replace" className="accent-primary" />
            {t.topology.replace}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t.topology.uploading : t.topology.upload}
            </Button>
          </div>
        </form>
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{t.topology.downloadHint}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/api/topology/template?format=csv">{t.topology.csv}</a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/api/topology/template?format=xlsx">{t.topology.excel}</a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href="/api/topology/template?format=pdf">{t.topology.pdf}</a>
            </Button>
          </div>
        </div>
        {result && <p className="mt-4 text-sm text-muted-foreground">{result}</p>}
      </CardContent>
    </Card>
  );
}
