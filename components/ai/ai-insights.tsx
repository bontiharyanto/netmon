"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InsightCard = {
  id: string;
  title: string;
  severity: "ok" | "warning" | "critical";
  body: string;
};

type Insights = {
  enabled: boolean;
  engine: string;
  mode: string;
  generatedAt: string;
  cards: InsightCard[];
  message: string | null;
};

export function AiInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/ai/insights");
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    setLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Unable to load insights");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Generating insights…</p>;
  }

  if (data && !data.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
          <CardDescription>{data.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <p className="text-sm text-muted-foreground">
            Engine {data?.engine} · {data?.mode} · {data ? new Date(data.generatedAt).toLocaleTimeString() : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.cards.map((card) => (
          <Card key={card.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <CardTitle className="text-[15px]">{card.title}</CardTitle>
              <Badge
                variant={card.severity === "critical" ? "crit" : card.severity === "warning" ? "warn" : "ok"}
              >
                {card.severity}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className={cn("text-sm leading-6 text-muted-foreground")}>{card.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
