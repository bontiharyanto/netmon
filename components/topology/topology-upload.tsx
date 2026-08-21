"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TopologyUpload() {
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
        toast.error(json.error ?? "Topology import failed");
        return;
      }
      const extra = json.missing?.length ? ` Missing: ${json.missing.join(", ")}` : "";
      setResult(`${json.imported} links saved · ${json.skipped} skipped.${extra}`);
      toast.success("Topology uploaded");
      router.refresh();
    } catch {
      toast.error("Topology import failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload network topology</CardTitle>
        <CardDescription>
          CSV, Excel, or JSON. Columns: <span className="font-mono">from</span>, <span className="font-mono">to</span>,{" "}
          <span className="font-mono">status</span>. Endpoints must match existing hostnames or IPs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="file" type="file" accept=".csv,.xlsx,.xls,.json" required className="block text-sm" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="replace" className="accent-primary" />
            Replace all existing links
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : "Upload topology"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href="/api/topology/template">Download template</a>
            </Button>
          </div>
        </form>
        {result && <p className="mt-4 text-sm text-muted-foreground">{result}</p>}
      </CardContent>
    </Card>
  );
}
