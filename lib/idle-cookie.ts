import { createHmac, timingSafeEqual } from "crypto";
import {
  idleCookieOptions,
  idleCookiePayload,
  idleCookieSigningInput,
  parseIdleMinutes,
  sessionMaxSeconds,
  type IdleMinutes,
} from "@/lib/idle";

function idleSecret() {
  return process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? "netmon-dev-key";
}

function signPayload(payload: string) {
  return createHmac("sha256", idleSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Cookie value: lastActiveMs.idleMinutes.signature */
export function sealIdleCookie(lastActiveMs: number, idleMinutes: IdleMinutes) {
  const payload = idleCookieSigningInput(lastActiveMs, idleMinutes);
  return `${payload}.${signPayload(payload)}`;
}

export function parseIdleCookie(raw: string | undefined | null) {
  const base = idleCookiePayload(raw);
  if (!base || !raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const payload = idleCookieSigningInput(base.lastActiveMs, base.idleMinutes);
  if (!safeEqual(signPayload(payload), parts[2])) return null;
  return base;
}

export function buildIdleCookie(lastActiveMs: number, idleMinutes: IdleMinutes) {
  return {
    value: sealIdleCookie(lastActiveMs, idleMinutes),
    options: idleCookieOptions(sessionMaxSeconds()),
  };
}

export function normalizeIdleMinutes(value: unknown): IdleMinutes {
  return parseIdleMinutes(value);
}
