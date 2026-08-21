"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  async function download() {
    const res = await fetch("/api/reports");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netmon-report.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">PDF availability, alert, dan SLA.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly operations report</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={download}>Download PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
}
