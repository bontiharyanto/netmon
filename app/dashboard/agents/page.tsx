"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

type Agent = {
  id: string;
  token: string;
  status: string;
  version: string;
  last_seen: string | null;
  device: { hostname: string };
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [devices, setDevices] = useState<{ id: string; hostname: string }[]>([]);

  async function load() {
    const [a, d] = await Promise.all([fetch("/api/agents"), fetch("/api/devices")]);
    if (a.ok) setAgents(await a.json());
    if (d.ok) setDevices(await d.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function enroll(formData: FormData) {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: formData.get("deviceId") }),
    });
    if (!res.ok) {
      toast.error("Gagal enroll agent");
      return;
    }
    toast.success("Agent token dibuat");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agents</h1>
        <p className="text-sm text-muted-foreground">Heartbeat ke /api/agent/heartbeat</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Enroll</CardTitle></CardHeader>
        <CardContent>
          <form action={enroll} className="flex gap-3">
            <select name="deviceId" className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm">
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.hostname}
                </option>
              ))}
            </select>
            <Button type="submit">Create token</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-4">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-md bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{agent.device.hostname}</p>
                <StatusBadge status={agent.status} />
              </div>
              <p className="mt-1 font-mono text-xs break-all">{agent.token}</p>
              <p className="text-xs text-muted-foreground">v{agent.version}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Install snippet</CardTitle></CardHeader>
        <CardContent>
          <Input readOnly value="curl -s https://netmon.click/agent.sh | bash -s -- --token=AGENT_TOKEN" />
        </CardContent>
      </Card>
    </div>
  );
}
