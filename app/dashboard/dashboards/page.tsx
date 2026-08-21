"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Dash = { id: string; name: string; layout: { widgets: { id: string; type: string }[] } };

export default function DashboardsPage() {
  const [items, setItems] = useState<Dash[]>([]);

  async function load() {
    const res = await fetch("/api/dashboards");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function create(formData: FormData) {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name") }),
    });
    if (!res.ok) {
      toast.error("Gagal membuat dashboard");
      return;
    }
    toast.success("Dashboard dibuat");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard builder</h1>
        <p className="text-sm text-muted-foreground">Layout JSON: availability, alerts, cpu.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>New board</CardTitle></CardHeader>
        <CardContent>
          <form action={create} className="flex gap-3">
            <Input name="name" placeholder="NOC night shift" required />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader><CardTitle>{item.name}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(item.layout?.widgets ?? []).map((widget) => (
                <div key={widget.id} className="rounded-md bg-muted/50 p-4 text-sm">
                  {widget.type}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
