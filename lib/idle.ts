export const IDLE_COOKIE = "netmon_idle";
export const IDLE_CHANNEL = "netmon-session";
export const IDLE_OPTIONS = [0, 15, 30, 60] as const;
export const DEFAULT_IDLE_MINUTES = 30;
export const IDLE_WARN_MS = 60_000;
export const IDLE_ACTIVITY_THROTTLE_MS = 15_000;
/** Absolute JWT / session lifetime regardless of activity. */
export const DEFAULT_SESSION_MAX_HOURS = 8;
export const SESSION_MAX_HOURS_CAP = 24;

export type IdleMinutes = (typeof IDLE_OPTIONS)[number];

export function parseIdleMinutes(value: unknown): IdleMinutes {
  const n = Number(value);
  if (n === 0 || n === 15 || n === 30 || n === 60) return n;
  return DEFAULT_IDLE_MINUTES;
}

export function idleTimeoutMs(minutes: IdleMinutes) {
  return minutes * 60_000;
}

export function sessionMaxHours() {
  const raw = Number(process.env.SESSION_MAX_HOURS ?? DEFAULT_SESSION_MAX_HOURS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SESSION_MAX_HOURS;
  return Math.min(SESSION_MAX_HOURS_CAP, Math.max(1, Math.floor(raw)));
}

export function sessionMaxSeconds() {
  return sessionMaxHours() * 3600;
}

export function shouldWarnIdle(lastActiveMs: number, minutes: IdleMinutes, now = Date.now()) {
  if (minutes === 0) return false;
  const remaining = idleTimeoutMs(minutes) - (now - lastActiveMs);
  return remaining > 0 && remaining <= IDLE_WARN_MS;
}

export function idleRemainingMs(lastActiveMs: number, minutes: IdleMinutes, now = Date.now()) {
  if (minutes === 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, idleTimeoutMs(minutes) - (now - lastActiveMs));
}

export function isIdleExpired(lastActiveMs: number, idleMinutes: IdleMinutes, now = Date.now()) {
  if (idleMinutes === 0) return false;
  return now - lastActiveMs >= idleTimeoutMs(idleMinutes);
}

export function idleCookieOptions(maxAgeSeconds: number) {
  const secure =
    (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "").startsWith("https://") ||
    process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(60, maxAgeSeconds),
  };
}

export type IdleCookiePayload = {
  lastActiveMs: number;
  idleMinutes: IdleMinutes;
};

export function idleCookiePayload(raw: string | undefined | null): IdleCookiePayload | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const lastActiveMs = Number(parts[0]);
  if (!Number.isFinite(lastActiveMs) || lastActiveMs <= 0) return null;
  if (lastActiveMs > Date.now() + 120_000) return null;
  return { lastActiveMs, idleMinutes: parseIdleMinutes(parts[1]) };
}

export function idleCookieSigningInput(lastActiveMs: number, idleMinutes: IdleMinutes) {
  return `${Math.floor(lastActiveMs)}.${idleMinutes}`;
}
