import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CHANNEL_CATALOG, SECRET_KEYS } from "@/lib/channels";
import { decryptSecret, encryptSecret, isMasked } from "@/lib/crypto";

type Config = Record<string, string>;

export async function ensureChannelCatalog(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return;

  for (const kind of CHANNEL_CATALOG) {
    await prisma.notify_channel.upsert({
      where: { tenant_id_type: { tenant_id: tenantId, type: kind.type } },
      update: {},
      create: {
        tenant_id: tenantId,
        type: kind.type,
        name: kind.name,
        enabled: false,
        config: {},
        severities: kind.type === "sms" || kind.type === "pagerduty" ? "critical" : "critical,warning",
      },
    });
  }
}

export function maskConfig(config: Prisma.JsonValue): Config {
  const raw = (config && typeof config === "object" && !Array.isArray(config) ? config : {}) as Config;
  const out: Config = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value) {
      out[key] = "";
    } else if (SECRET_KEYS.includes(key)) {
      out[key] = "••••••••";
    } else {
      out[key] = String(value).startsWith("enc:") ? "••••••••" : String(value);
    }
  }
  return out;
}

export function mergeConfig(existing: Prisma.JsonValue, incoming: Config) {
  const prev = (existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {}) as Config;
  const next: Config = { ...prev };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue;
    const text = String(value);
    if (!text || isMasked(text)) continue;
    next[key] = SECRET_KEYS.includes(key) ? encryptSecret(text) : text;
  }
  return next;
}

export function readSecret(config: Prisma.JsonValue, key: string) {
  const raw = (config && typeof config === "object" && !Array.isArray(config) ? config : {}) as Config;
  const value = raw[key];
  return value ? decryptSecret(value) : "";
}
