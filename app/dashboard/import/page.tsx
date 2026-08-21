"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportPage() {
  const [result, setResult] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const res = await fetch("/api/import", { method: "POST", body: data });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Import gagal");
      return;
    }
    setResult(`${json.imported} device diimpor`);
    toast.success("Import selesai");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import CSV / Excel</h1>
        <p className="text-sm text-muted-foreground">
          Columns: hostname, ip, type, location, city. Network maps are uploaded from{" "}
          <a href="/dashboard/topology" className="text-primary underline-offset-4 hover:underline">
            Topology
          </a>
          .
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload inventory</CardTitle>
          <CardDescription>File .csv, .xlsx, atau .xls</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <input name="file" type="file" accept=".csv,.xlsx,.xls" required className="block text-sm" />
            <Button type="submit">Import</Button>
          </form>
          {result && <p className="mt-4 text-sm text-primary">{result}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
