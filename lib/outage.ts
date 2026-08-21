export const MASS_MIN_DOWN = 3;
export const MASS_MIN_RATIO = 0.15;
export const MASS_ALL_DOWN_MIN = 2;
export const MASS_MIN_CRITICAL = 5;
export const MASS_MIN_FIRING = 10;
export const TICKER_MAX = 240;

export type MassOutage = {
  active: true;
  total: number;
  down: number;
  degraded: number;
  firing: number;
  critical: number;
};

export type TickerSource = "custom" | "auto";

export type TickerState = {
  visible: boolean;
  text: string;
  custom: string;
  enabled: boolean;
  source: TickerSource;
};

export function detectMassOutage(input: {
  total: number;
  down: number;
  degraded?: number;
  firing: number;
  critical: number;
}): MassOutage | null {
  const total = input.total;
  const down = input.down;
  if (total <= 0) return null;

  const ratio = down / total;
  const devicesMass =
    (down >= MASS_MIN_DOWN && ratio >= MASS_MIN_RATIO) ||
    (total >= MASS_ALL_DOWN_MIN && down === total && down >= MASS_ALL_DOWN_MIN);
  const alertsMass = input.critical >= MASS_MIN_CRITICAL || input.firing >= MASS_MIN_FIRING;
  if (!devicesMass && !alertsMass) return null;

  return {
    active: true,
    total,
    down,
    degraded: input.degraded ?? 0,
    firing: input.firing,
    critical: input.critical,
  };
}

export function sanitizeTickerText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TICKER_MAX);
}

export function resolveTicker(input: {
  outage: MassOutage | null;
  custom: string;
  enabled: boolean;
  autoText: string;
}): TickerState {
  const custom = sanitizeTickerText(input.custom);
  if (input.enabled && custom) {
    return { visible: true, text: custom, custom, enabled: true, source: "custom" };
  }
  if (input.outage) {
    return {
      visible: true,
      text: custom || input.autoText,
      custom,
      enabled: input.enabled,
      source: custom ? "custom" : "auto",
    };
  }
  return { visible: false, text: "", custom, enabled: input.enabled, source: "auto" };
}
