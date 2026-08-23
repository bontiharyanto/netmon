import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { cfg, cfgEnabled } from "@/lib/ticket-providers";
import { novaCrmContext, novaCrmHeaders } from "@/lib/ticket-novacrm";
import { getCmdbSyncQueue, type CmdbSyncJob } from "@/lib/queue";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function fingerprint(tenantId: string, ciId: string) {
  return `netmon:${tenantId}:${ciId}`;
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 400) };
    }
    return { res, json };
  } finally {
    clearTimeout(timer);
  }
}

async function connectorFor(tenantId: string) {
  return prisma.ticket_connector.findFirst({
    where: { tenant_id: tenantId, provider: "novacrm", enabled: true },
    orderBy: { created_at: "asc" },
  });
}

export async function scheduleCmdbNovaSync(job: CmdbSyncJob) {
  try {
    const queue = getCmdbSyncQueue();
    await queue.add("sync", job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 4000 },
      removeOnComplete: 50,
      removeOnFail: 100,
      jobId: `${job.op}-${job.tenantId}-${job.ciId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "queue unavailable";
    if (/already (exists|waiting|delayed|active|paused)/i.test(message)) return;
    try {
      await processCmdbNovaSync(job);
    } catch {
      if (job.op === "upsert") {
        await prisma.cmdb_ci.updateMany({
          where: { id: job.ciId, tenant_id: job.tenantId },
          data: { last_sync_error: message.slice(0, 240) },
        });
      }
    }
  }
}

export async function processCmdbNovaSync(job: CmdbSyncJob) {
  const connector = await connectorFor(job.tenantId);
  if (!connector) return;
  if (!cfgEnabled(connector.config, "sync_cmdb", true)) return;

  const secret = connector.api_key ? decryptSecret(connector.api_key) : "";
  if (!secret) throw new Error("NovaCRM webhook secret is required");

  const nova = novaCrmContext(connector);
  const accountId = cfg(connector.config, "account_id").trim() || null;
  let ci = job.snapshot;
  if (job.op === "upsert") {
    const row = await prisma.cmdb_ci.findFirst({
      where: { id: job.ciId, tenant_id: job.tenantId },
      include: { device: { select: { hostname: true, ip: true } } },
    });
    if (!row) return;
    ci = {
      name: row.name,
      ci_type: row.ci_type,
      asset_tag: row.asset_tag,
      serial: row.serial,
      owner: row.owner,
      location: row.location,
      status: row.status,
      hostname: row.device?.hostname,
      ip: row.device?.ip,
    };
  }
  if (!ci) throw new Error("CMDB snapshot missing");

  const { res, json } = await fetchJson(nova.cmdb, {
    method: "POST",
    headers: novaCrmHeaders(secret, nova.slug),
    body: JSON.stringify({
      source: "NETMON",
      op: job.op,
      fingerprint: fingerprint(job.tenantId, job.ciId),
      accountId,
      ci: {
        id: job.ciId,
        name: ci.name,
        type: ci.ci_type,
        assetTag: ci.asset_tag ?? undefined,
        serial: ci.serial ?? undefined,
        location: ci.location ?? undefined,
        owner: ci.owner ?? undefined,
        status: ci.status,
      },
      device: {
        hostname: ci.hostname ?? undefined,
        ip: ci.ip ?? undefined,
      },
    }),
  });

  const root = asRecord(json);
  const data = asRecord(root.data);
  if (!res.ok) {
    const err = String(root.error ?? `NovaCRM ${res.status}`).slice(0, 240);
    if (job.op === "upsert") {
      await prisma.cmdb_ci.updateMany({
        where: { id: job.ciId, tenant_id: job.tenantId },
        data: { last_sync_error: err },
      });
    }
    throw new Error(err);
  }

  if (job.op === "upsert") {
    await prisma.cmdb_ci.updateMany({
      where: { id: job.ciId, tenant_id: job.tenantId },
      data: {
        external_asset_id: data.assetId ? String(data.assetId) : null,
        external_ci_id: data.ciId ? String(data.ciId) : null,
        last_synced_at: new Date(),
        last_sync_error: null,
      },
    });
  }
}
