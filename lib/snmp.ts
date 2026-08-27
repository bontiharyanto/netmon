import * as snmp from "net-snmp";
import { decryptSecret } from "@/lib/crypto";
import { parseSnmpOids, type SnmpOidMapping } from "@/lib/snmp-profiles";

export type SnmpPollResult = {
  ok: boolean;
  ms: number;
  error?: string;
  cpu_percent?: number;
  ram_percent?: number;
  disk_percent?: number;
  extra: Record<string, number>;
  samples: Array<{ key: string; oid: string; value: number | null; ok: boolean }>;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (Buffer.isBuffer(value)) {
    if (value.length === 0) return null;
    if (value.length >= 4) return value.readUInt32BE(0);
    const asInt = parseInt(value.toString("ascii"), 10);
    return Number.isFinite(asInt) ? asInt : null;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function pollSnmp(opts: {
  ip: string;
  port?: number;
  version?: string | null;
  communityEncrypted?: string | null;
  oids: SnmpOidMapping[] | unknown;
  timeoutMs?: number;
}): Promise<SnmpPollResult> {
  const mappings = Array.isArray(opts.oids) && opts.oids[0] && "oid" in (opts.oids[0] as object)
    ? (opts.oids as SnmpOidMapping[]).slice(0, 32)
    : parseSnmpOids(opts.oids).slice(0, 32);

  if (!mappings.length) {
    return { ok: false, ms: 0, error: "No OIDs in profile", extra: {}, samples: [] };
  }

  const community = opts.communityEncrypted ? decryptSecret(opts.communityEncrypted) : "";
  if (!community) {
    return { ok: false, ms: 0, error: "SNMP community missing", extra: {}, samples: [] };
  }

  const version = (opts.version || "v2c").toLowerCase();
  if (version === "v3") {
    return { ok: false, ms: 0, error: "SNMPv3 poll not enabled yet — use v2c", extra: {}, samples: [] };
  }

  const started = Date.now();
  const oidList = mappings.map((m) => m.oid);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: SnmpPollResult) => {
      if (settled) return;
      settled = true;
      try {
        session.close();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const session = snmp.createSession(opts.ip, community, {
      port: opts.port ?? 161,
      timeout: opts.timeoutMs ?? 2500,
      retries: 1,
      version: snmp.Version2c,
    });

    const timer = setTimeout(() => {
      finish({ ok: false, ms: Date.now() - started, error: "SNMP timeout", extra: {}, samples: [] });
    }, (opts.timeoutMs ?? 2500) + 1500);

    session.get(oidList, (error: Error | null, varbinds: Array<{ oid: string; type: number; value: unknown }>) => {
      clearTimeout(timer);
      if (error) {
        finish({
          ok: false,
          ms: Date.now() - started,
          error: error.message || "SNMP get failed",
          extra: {},
          samples: mappings.map((m) => ({ key: m.key, oid: m.oid, value: null, ok: false })),
        });
        return;
      }

      const extra: Record<string, number> = {};
      let cpu_percent: number | undefined;
      let ram_percent: number | undefined;
      let disk_percent: number | undefined;
      const samples: SnmpPollResult["samples"] = [];
      let anyOk = false;

      for (let i = 0; i < mappings.length; i += 1) {
        const map = mappings[i]!;
        const vb = varbinds[i];
        if (!vb || snmp.isVarbindError(vb)) {
          samples.push({ key: map.key, oid: map.oid, value: null, ok: false });
          continue;
        }
        const raw = toNumber(vb.value);
        if (raw == null) {
          samples.push({ key: map.key, oid: map.oid, value: null, ok: false });
          continue;
        }
        const value = raw * (map.scale ?? 1);
        anyOk = true;
        samples.push({ key: map.key, oid: map.oid, value, ok: true });
        if (map.metric === "cpu_percent") cpu_percent = Math.max(0, Math.min(100, value));
        else if (map.metric === "ram_percent") ram_percent = Math.max(0, Math.min(100, value));
        else if (map.metric === "disk_percent") disk_percent = Math.max(0, Math.min(100, value));
        else extra[map.key] = value;
      }

      finish({
        ok: anyOk,
        ms: Date.now() - started,
        error: anyOk ? undefined : "All SNMP OIDs failed",
        cpu_percent,
        ram_percent,
        disk_percent,
        extra,
        samples,
      });
    });
  });
}

export function maskSnmpCommunity(value: string | null | undefined) {
  if (!value) return null;
  return "••••••••";
}
