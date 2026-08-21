"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AI_MODES,
  CLOUD_LLM_PROVIDERS,
  LOCAL_LLM_PROVIDERS,
  dockerHostUrl,
  getAiProvider,
  type AiMode,
} from "@/lib/ai-providers";
import { cn } from "@/lib/utils";

type Setting = {
  enabled: boolean;
  mode: AiMode;
  provider: string;
  base_url: string;
  model: string;
  api_key: string;
  has_key: boolean;
  copilot_enabled: boolean;
  insights_enabled: boolean;
  last_status: string | null;
};

const EMPTY: Setting = {
  enabled: true,
  mode: "rules",
  provider: "ollama",
  base_url: "http://127.0.0.1:11434/v1",
  model: "llama3.1",
  api_key: "",
  has_key: false,
  copilot_enabled: true,
  insights_enabled: true,
  last_status: null,
};

export function AiIntegrationSettings() {
  const [setting, setSetting] = useState<Setting>(EMPTY);
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const provider = getAiProvider(setting.provider);
  const catalog = setting.mode === "cloud" ? CLOUD_LLM_PROVIDERS : LOCAL_LLM_PROVIDERS;
  const modelOptions = useMemo(
    () => Array.from(new Set([setting.model, ...discovered, ...(provider?.models ?? [])].filter(Boolean))),
    [setting.model, discovered, provider],
  );

  async function load() {
    const res = await fetch("/api/ai/settings");
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Unable to load AI settings");
      return;
    }
    setSetting(data.setting);
  }

  useEffect(() => {
    load();
  }, []);

  function selectMode(mode: AiMode) {
    if (mode === "rules") {
      setSetting({ ...setting, mode });
      return;
    }
    const list = mode === "local" ? LOCAL_LLM_PROVIDERS : CLOUD_LLM_PROVIDERS;
    const current = list.find((item) => item.id === setting.provider) ?? list[0];
    setSetting({
      ...setting,
      mode,
      provider: current.id,
      base_url: current.base_url,
      model: current.models[0],
    });
    setDiscovered([]);
  }

  function selectProvider(id: string) {
    const item = getAiProvider(id);
    if (!item) return;
    setSetting({
      ...setting,
      provider: item.id,
      base_url: item.base_url,
      model: item.models[0],
    });
    setDiscovered([]);
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/ai/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setting),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Save failed");
      return;
    }
    setSetting(data.setting);
    toast.success("AI integration saved");
  }

  async function probe(kind: "test" | "models") {
    setTesting(true);
    const path = kind === "test" ? "/api/ai/settings/test" : "/api/ai/settings/models";
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: setting.mode,
        provider: setting.provider,
        base_url: setting.base_url,
        model: setting.model,
        api_key: setting.api_key,
      }),
    });
    const data = await res.json();
    setTesting(false);
    if (Array.isArray(data.models)) setDiscovered(data.models);
    if (kind === "models") {
      if (!res.ok) toast.error(data.error ?? "Could not list models");
      else if (data.models[0]) {
        setSetting((current) => ({ ...current, model: current.model || data.models[0] }));
        toast.success(`${data.models.length} model${data.models.length === 1 ? "" : "s"} found`);
      } else toast.error("Endpoint reachable, but no models are installed");
      return;
    }
    if (!res.ok) toast.error(data.status ?? "Test failed");
    else toast.success(data.status);
    setSetting((current) => ({ ...current, last_status: data.status ?? current.last_status }));
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading AI settings…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Administrator</p>
        <h1 className="mt-1 text-2xl font-semibold">AI integration</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Rules stay on-box. Local LLM talks to Ollama or any OpenAI-compatible server on this host or LAN. Cloud is
          optional.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Engine</CardTitle>
            <CardDescription>Master switch and runtime</CardDescription>
          </div>
          {setting.enabled ? <Badge variant="ok">Enabled</Badge> : <Badge variant="muted">Disabled</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Enable NETMON AI"
            hint="Turns copilot and insights off for this tenant"
            on={setting.enabled}
            onChange={(enabled) => setSetting({ ...setting, enabled })}
          />
          <div className="grid gap-2 md:grid-cols-3">
            {AI_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => selectMode(mode.id)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-sm",
                  setting.mode === mode.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40",
                )}
              >
                <p className="font-medium">{mode.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{mode.blurb}</p>
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              label="AI Insights"
              hint="Health, RCA, SLA risk, capacity"
              on={setting.insights_enabled}
              onChange={(insights_enabled) => setSetting({ ...setting, insights_enabled })}
            />
            <ToggleRow
              label="AI Copilot"
              hint="Natural-language questions"
              on={setting.copilot_enabled}
              onChange={(copilot_enabled) => setSetting({ ...setting, copilot_enabled })}
            />
          </div>
        </CardContent>
      </Card>

      {setting.mode !== "rules" && (
        <Card>
          <CardHeader>
            <CardTitle>{setting.mode === "local" ? "Local LLM server" : "Cloud provider"}</CardTitle>
            <CardDescription>
              {setting.mode === "local"
                ? "Point NETMON at Ollama or another LLM installed on this server. No API key required."
                : "Used only when a key is stored. Tenant context only."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectProvider(item.id)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left text-sm",
                    setting.provider === item.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40",
                  )}
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                </button>
              ))}
            </div>

            {setting.mode === "local" && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                <p>
                  Ollama: <span className="font-mono text-foreground">ollama pull llama3.1</span> then serve with{" "}
                  <span className="font-mono text-foreground">OLLAMA_HOST=0.0.0.0:11434</span>.
                </p>
                <p className="mt-1">
                  If NETMON runs in Docker and Ollama is on the host, use{" "}
                  <span className="font-mono text-foreground">host.docker.internal</span> instead of 127.0.0.1.
                </p>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Base URL</Label>
              {dockerHostUrl(setting.provider) && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setSetting({ ...setting, base_url: dockerHostUrl(setting.provider)! })}
                    >
                      Use Docker host URL
                    </button>
                  )}
                </div>
                <Input
                  className="font-mono"
                  value={setting.base_url}
                  onChange={(e) => setSetting({ ...setting, base_url: e.target.value })}
                  placeholder="http://127.0.0.1:11434/v1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input
                  list="ai-models"
                  className="font-mono"
                  value={setting.model}
                  onChange={(e) => setSetting({ ...setting, model: e.target.value })}
                  placeholder="llama3.1"
                />
                <datalist id="ai-models">
                  {modelOptions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>{provider?.needs_key ? "API key" : "API key (optional)"}</Label>
                <Input
                  type="password"
                  placeholder={setting.has_key ? "••••••••" : provider?.needs_key ? "sk-…" : "Leave empty for Ollama"}
                  value={setting.api_key}
                  onChange={(e) => setSetting({ ...setting, api_key: e.target.value })}
                />
              </div>
            </div>

            {setting.last_status && (
              <p className="font-mono text-xs text-muted-foreground">Last test: {setting.last_status}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" disabled={testing} onClick={() => probe("test")}>
                {testing ? "Checking…" : "Test connection"}
              </Button>
              {setting.mode === "local" && (
                <Button variant="outline" disabled={testing} onClick={() => probe("models")}>
                  Load installed models
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {setting.mode === "rules" && (
        <div className="flex gap-2">
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn("relative h-6 w-11 rounded-full", on ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-background", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}
