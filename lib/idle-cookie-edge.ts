import {
  idleCookiePayload,
  idleCookieSigningInput,
  type IdleCookiePayload,
} from "@/lib/idle";

function idleSecret() {
  return process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET ?? "netmon-dev-key";
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(idleSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(sig);
}

async function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Edge-safe verify for middleware. */
export async function parseIdleCookieEdge(raw: string | undefined | null): Promise<IdleCookiePayload | null> {
  const base = idleCookiePayload(raw);
  if (!base || !raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const payload = idleCookieSigningInput(base.lastActiveMs, base.idleMinutes);
  const expected = await signPayload(payload);
  if (!(await safeEqual(expected, parts[2]))) return null;
  return base;
}
