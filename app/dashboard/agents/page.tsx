"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useI18n } from "@/components/layout/locale-provider";

type Agent = {
  id: string;
  token: string;
  status: string;
  version: string;
  last_seen: string | null;
  device: { hostname: string };
};

type Device = { id: string; hostname: string };

function installCommand(token: string) {
  const origin = typeof window === "undefined" ? "https://netmon.click" : window.location.origin;
  return `curl -sS ${origin}/agent.sh | bash -s -- --token=${token} --url=${origin}`;
}

async function copyText(value: string, ok: string) {
  await navigator.clipboard.writeText(value);
  toast.success(ok);
}

export default function AgentsPage() {
  const { t } = useI18n();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [issued, setIssued] = useState<Agent | null>(null);

  async function load() {
    const [a, d] = await Promise.all([fetch("/api/agents"), fetch("/api/devices")]);
    if (a.ok) setAgents(await a.json());
    if (d.ok) setDevices(await d.json());
  }

  useEffect(() => {
    load();
  }, []);

  const enrolled = useMemo(() => new Set(agents.map((agent) => agent.device.hostname)), [agents]);

  async function enroll(formData: FormData) {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: formData.get("deviceId") }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? t.agents.failed);
      return;
    }
    setIssued(data);
    toast.success(t.agents.created);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.agents.title}</h1>
        <p className="text-sm text-muted-foreground">{t.agents.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.agents.howTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t.agents.howPoller}</p>
          <p>{t.agents.howAgent}</p>
          <p>{t.agents.step1}</p>
          <p>{t.agents.step2}</p>
          <p>{t.agents.step3}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.agents.enroll}</CardTitle>
          <CardDescription>{t.agents.enrollHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.agents.emptyDevices}</p>
          ) : (
            <form action={enroll} className="flex flex-wrap gap-3">
              <select name="deviceId" className="h-9 min-w-[16rem] flex-1 rounded-md border border-input bg-background px-2 font-mono text-sm">
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.hostname}
                    {enrolled.has(device.hostname) ? t.agents.enrolled : ""}
                  </option>
                ))}
              </select>
              <Button type="submit">{t.agents.create}</Button>
            </form>
          )}
          {issued && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium">
                {issued.device.hostname} · {t.agents.install}
              </p>
              <p className="break-all font-mono text-xs text-muted-foreground">{installCommand(issued.token)}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(issued.token, t.agents.copied)}>
                  {t.agents.copyToken}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(installCommand(issued.token), t.agents.copied)}
                >
                  {t.agents.copyInstall}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.nav.agents}</CardTitle>
          <CardDescription>{agents.length ? undefined : t.agents.empty}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{agent.device.hostname}</p>
                <StatusBadge status={agent.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {agent.status === "online" ? t.agents.onlineHint : t.agents.pendingHint}
                {agent.last_seen ? ` · ${new Date(agent.last_seen).toLocaleString()}` : ""}
                {agent.version ? ` · v${agent.version}` : ""}
              </p>
              <p className="break-all font-mono text-[11px] text-muted-foreground">
                {t.agents.token}: {agent.token}
              </p>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{installCommand(agent.token)}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(agent.token, t.agents.copied)}>
                  {t.agents.copyToken}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(installCommand(agent.token), t.agents.copied)}
                >
                  {t.agents.copyInstall}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
