"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { groupDevicesByCity } from "@/lib/geo/indonesia-cities";
import { useI18n } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";

export type SiteDevice = {
  id: string;
  hostname: string;
  ip: string;
  type: string;
  status: string;
  location?: string | null;
  city?: string | null;
};

const IndonesiaMap = dynamic(() => import("./indonesia-map").then((m) => m.IndonesiaMap), {
  ssr: false,
  loading: () => <div className="h-full min-h-[520px] rounded-lg bg-muted/40" />,
});

export function SiteMap({ devices }: { devices: SiteDevice[] }) {
  const { t } = useI18n();
  const { sites, unmapped } = useMemo(() => groupDevicesByCity(devices), [devices]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = sites.find((s) => s.city.slug === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {t.map.title} · {sites.length} {t.map.cities}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {devices.length - unmapped.length}/{devices.length} {t.map.placed}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[520px] lg:h-[560px]">
            <IndonesiaMap sites={sites} selectedSlug={selected} onSelect={setSelected} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.map.cities}</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[360px] space-y-1 overflow-y-auto p-2">
            {sites.length === 0 && <p className="px-2 py-4 text-sm text-muted-foreground">{t.map.empty}</p>}
            {sites.map(({ city, devices: rows }) => {
              const down = rows.filter((d) => d.status === "down").length;
              const on = city.slug === selected;
              return (
                <button
                  key={city.slug}
                  type="button"
                  onClick={() => setSelected(on ? null : city.slug)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    on ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  <span>
                    <span className="block font-medium">{city.name}</span>
                    <span className="text-[11px] text-muted-foreground">{city.province}</span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {rows.length}
                    {down ? ` · ${down}` : ""}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {unmapped.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.map.unmapped}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              <p className="mb-2 text-xs text-muted-foreground">{t.map.unmappedHint}</p>
              {unmapped.slice(0, 8).map((device) => (
                <p key={device.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs">{device.hostname}</span>
                  <StatusBadge status={device.status} />
                </p>
              ))}
              {unmapped.length > 8 && (
                <p className="pt-1 text-xs text-muted-foreground">+{unmapped.length - 8}</p>
              )}
            </CardContent>
          </Card>
        )}

        {active && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{active.city.name}</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[220px] space-y-2 overflow-y-auto p-3 pt-0">
              {active.devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{device.hostname}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{device.ip}</p>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
