import { encryptSecret, isMasked } from "@/lib/crypto";
import { maskSnmpCommunity } from "@/lib/snmp";

/** Strip secrets from device JSON for API responses. */
export function publicDevice<T extends Record<string, unknown>>(device: T) {
  const next = { ...device } as T & {
    snmp_community?: string | null;
    snmp_v3_auth_key?: string | null;
    snmp_v3_priv_key?: string | null;
    snmp_community_set?: boolean;
  };
  const hasCommunity = Boolean(next.snmp_community);
  next.snmp_community = maskSnmpCommunity(next.snmp_community);
  next.snmp_v3_auth_key = next.snmp_v3_auth_key ? "••••••••" : null;
  next.snmp_v3_priv_key = next.snmp_v3_priv_key ? "••••••••" : null;
  next.snmp_community_set = hasCommunity;
  return next;
}

export function resolveCommunityUpdate(
  incoming: string | null | undefined,
  existing: string | null | undefined,
): string | null | undefined {
  if (incoming === undefined) return undefined;
  if (incoming === null || incoming === "") return null;
  if (isMasked(incoming)) return existing ?? undefined;
  return encryptSecret(incoming);
}
