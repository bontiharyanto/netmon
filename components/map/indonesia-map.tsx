"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { useTheme } from "next-themes";
import "leaflet/dist/leaflet.css";
import { INDONESIA_BOUNDS, INDONESIA_CENTER, type IndonesiaCity } from "@/lib/geo/indonesia-cities";
import { StatusBadge } from "@/components/status-badge";

export type MapDevice = {
  id: string;
  hostname: string;
  ip: string;
  status: string;
  location?: string | null;
};

export type MapSite = {
  city: IndonesiaCity;
  devices: MapDevice[];
};

function FlyTo({ site }: { site: IndonesiaCity | null }) {
  const map = useMap();
  const slug = site?.slug ?? "";
  useEffect(() => {
    if (site) map.flyTo([site.lat, site.lng], 8, { duration: 0.55 });
    else map.flyTo(INDONESIA_CENTER, 5, { duration: 0.55 });
  }, [map, slug, site]);
  return null;
}

function markerColor(devices: MapDevice[]) {
  if (devices.some((d) => d.status === "down")) return "#f87171";
  if (devices.some((d) => d.status === "degraded")) return "#fbbf24";
  if (devices.every((d) => d.status === "up")) return "#00e5c3";
  return "#94a3b8";
}

export function IndonesiaMap({
  sites,
  selectedSlug,
  onSelect,
}: {
  sites: MapSite[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === "light";
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  // CARTO raster basemaps now watermark without a key (https://carto.com/basemaps/apikey).
  // Default to OSM so production works without signup; optional CARTO when key is set.
  const tiles = cartoKey
    ? light
      ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
      : `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = cartoKey
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const selected = sites.find((s) => s.city.slug === selectedSlug)?.city ?? null;

  return (
    <MapContainer
      key={tiles}
      center={INDONESIA_CENTER}
      zoom={5}
      minZoom={4}
      maxZoom={12}
      maxBounds={INDONESIA_BOUNDS}
      scrollWheelZoom
      className="h-full w-full rounded-lg"
      style={{ background: light ? "#e8eef2" : "#0b1014" }}
    >
      <TileLayer attribution={attribution} url={tiles} />
      <FlyTo site={selected} />
      {sites.map(({ city, devices }) => {
        const active = city.slug === selectedSlug;
        const color = markerColor(devices);
        return (
          <CircleMarker
            key={city.slug}
            center={[city.lat, city.lng]}
            radius={Math.min(18, 7 + devices.length)}
            pathOptions={{
              color: active ? "#00e5c3" : color,
              weight: active ? 3 : 1.5,
              fillColor: color,
              fillOpacity: active ? 0.9 : 0.72,
            }}
            eventHandlers={{ click: () => onSelect(active ? null : city.slug) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <span className="font-medium">
                {city.name} · {devices.length}
              </span>
            </Tooltip>
            <Popup>
              <div className="min-w-[180px] space-y-2 text-sm">
                <div>
                  <p className="font-medium">{city.name}</p>
                  <p className="text-xs text-muted-foreground">{city.province}</p>
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {devices.map((device) => (
                    <li key={device.id} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{device.hostname}</span>
                      <StatusBadge status={device.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
