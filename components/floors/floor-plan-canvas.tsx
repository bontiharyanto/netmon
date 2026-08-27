"use client";

import { useCallback, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { FloorHeatOverlay } from "@/components/floors/floor-heat-overlay";

export type FloorPin = {
  id: string;
  x: number;
  y: number;
  rack?: string | null;
  zone?: string | null;
  device: {
    id: string;
    hostname: string;
    ip: string;
    type: string;
    status: string;
    sensor_kind?: string | null;
    last_sensor_value?: number | null;
    last_sensor_unit?: string | null;
  };
};

function pinColor(status: string) {
  if (status === "down") return "#f87171";
  if (status === "degraded") return "#fbbf24";
  if (status === "up") return "#00e5c3";
  return "#94a3b8";
}

export function FloorPlanCanvas({
  imageUrl,
  placements,
  canWrite,
  placingDeviceId,
  onPlace,
  onMove,
  onSelect,
  selectedId,
  showHeat = false,
}: {
  imageUrl: string | null;
  placements: FloorPin[];
  canWrite: boolean;
  placingDeviceId: string | null;
  onPlace: (x: number, y: number) => void;
  onMove: (placementId: string, x: number, y: number) => void;
  onSelect: (placementId: string | null) => void;
  selectedId: string | null;
  showHeat?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const el = frameRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
  }, []);

  function onCanvasClick(event: React.MouseEvent) {
    if (!canWrite || !placingDeviceId || dragging) return;
    const { x, y } = toPercent(event.clientX, event.clientY);
    onPlace(x, y);
  }

  function onPointerDown(event: React.PointerEvent, placementId: string) {
    if (!canWrite) {
      onSelect(placementId);
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(placementId);
    onSelect(placementId);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragging || !canWrite) return;
    const { x, y } = toPercent(event.clientX, event.clientY);
    onMove(dragging, x, y);
  }

  function onPointerUp() {
    setDragging(null);
  }

  if (!imageUrl) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        Upload a floor plan image (JPG, PNG, or WebP) to place devices.
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden rounded-lg border border-border bg-muted/30 ${
        placingDeviceId ? "cursor-crosshair" : "cursor-default"
      }`}
      onClick={onCanvasClick}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Floor plan" className="block h-auto w-full select-none" draggable={false} />
      <FloorHeatOverlay placements={placements} enabled={showHeat} />
      {placements.map((pin) => {
        const active = pin.id === selectedId;
        const color = pinColor(pin.device.status);
        const sensorLabel =
          pin.device.last_sensor_value != null
            ? ` · ${pin.device.last_sensor_value}${pin.device.last_sensor_unit || ""}`
            : "";
        return (
          <button
            key={pin.id}
            type="button"
            title={`${pin.device.hostname} · ${pin.device.ip}${sensorLabel}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(pin.id);
            }}
            onPointerDown={(event) => onPointerDown(event, pin.id)}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border-2 shadow-sm transition-transform duration-200 ${
                active ? "scale-125 border-primary" : "border-background"
              }`}
              style={{ backgroundColor: color }}
            />
            <span className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded bg-background/90 px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-sm">
              {pin.device.hostname}
              {sensorLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PlacementList({
  placements,
  selectedId,
  canWrite,
  onSelect,
  onRemove,
}: {
  placements: FloorPin[];
  selectedId: string | null;
  canWrite: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!placements.length) {
    return <p className="text-sm text-muted-foreground">No devices placed on this floor yet.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {placements.map((pin) => (
        <li
          key={pin.id}
          className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
            selectedId === pin.id ? "bg-primary/10" : ""
          }`}
        >
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(pin.id)}>
            <p className="truncate font-medium">{pin.device.hostname}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {pin.device.ip} · {pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%
              {pin.rack || pin.zone ? ` · ${[pin.zone, pin.rack].filter(Boolean).join(" / ")}` : ""}
              {pin.device.last_sensor_value != null
                ? ` · ${pin.device.last_sensor_value}${pin.device.last_sensor_unit || ""}`
                : ""}
            </p>
          </button>
          <StatusBadge status={pin.device.status} />
          {canWrite && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onRemove(pin.id)}
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
