"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  defaultTempRange,
  heatSamplesFromPins,
  idwAt,
  tempToRgba,
  type HeatSample,
} from "@/lib/floor-heat";
import type { FloorPin } from "@/components/floors/floor-plan-canvas";

const COLS = 40;
const ROWS = 28;

export function FloorHeatOverlay({
  placements,
  enabled,
}: {
  placements: FloorPin[];
  enabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samples = useMemo(() => heatSamplesFromPins(placements), [placements]);
  const range = useMemo(() => defaultTempRange(samples), [samples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w < 8 || h < 8) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    if (samples.length < 1) return;

    const cellW = w / COLS;
    const cellH = h / ROWS;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const xPct = ((col + 0.5) / COLS) * 100;
        const yPct = ((row + 0.5) / ROWS) * 100;
        const t = idwAt(xPct, yPct, samples as HeatSample[]);
        if (t == null) continue;
        ctx.fillStyle = tempToRgba(t, range.min, range.max, samples.length === 1 ? 0.28 : 0.42);
        ctx.fillRect(col * cellW, row * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }, [enabled, samples, range.min, range.max]);

  if (!enabled) return null;

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 font-mono text-[10px] text-muted-foreground shadow-sm">
        {samples.length === 0
          ? "Add temperature sensors to this floor"
          : `${range.min.toFixed(1)}°C — ${range.max.toFixed(1)}°C · ${samples.length} sensor${samples.length === 1 ? "" : "s"}`}
      </div>
    </>
  );
}
