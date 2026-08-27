/** Inverse-distance weighting heat samples for floor overlays. */

export type HeatSample = { x: number; y: number; value: number };

export function heatSamplesFromPins(
  pins: Array<{
    x: number;
    y: number;
    device: {
      type: string;
      sensor_kind?: string | null;
      last_sensor_value?: number | null;
    };
  }>,
): HeatSample[] {
  return pins
    .filter(
      (p) =>
        p.device.last_sensor_value != null &&
        Number.isFinite(p.device.last_sensor_value) &&
        (p.device.type === "sensor"
          ? (p.device.sensor_kind || "temperature") === "temperature"
          : true),
    )
    .map((p) => ({ x: p.x, y: p.y, value: p.device.last_sensor_value as number }));
}

/** Blue → teal → amber ramp (single family, not rainbow). */
export function tempToRgba(t: number, min: number, max: number, alpha = 0.45): string {
  const span = Math.max(0.001, max - min);
  const n = Math.min(1, Math.max(0, (t - min) / span));
  let r: number;
  let g: number;
  let b: number;
  if (n < 0.5) {
    const u = n / 0.5;
    r = Math.round(56 + u * (0 - 56));
    g = Math.round(120 + u * (229 - 120));
    b = Math.round(180 + u * (195 - 180));
  } else {
    const u = (n - 0.5) / 0.5;
    r = Math.round(0 + u * (245 - 0));
    g = Math.round(229 + u * (158 - 229));
    b = Math.round(195 + u * (11 - 195));
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

export function idwAt(x: number, y: number, samples: HeatSample[], power = 2): number | null {
  if (!samples.length) return null;
  let num = 0;
  let den = 0;
  for (const s of samples) {
    const dx = x - s.x;
    const dy = y - s.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 0.0001) return s.value;
    const w = 1 / Math.pow(d2, power / 2);
    num += w * s.value;
    den += w;
  }
  return den > 0 ? num / den : null;
}

export function defaultTempRange(samples: HeatSample[]): { min: number; max: number } {
  if (!samples.length) return { min: 18, max: 32 };
  const values = samples.map((s) => s.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  if (maxV - minV < 1) return { min: minV - 2, max: maxV + 2 };
  return { min: minV, max: maxV };
}
