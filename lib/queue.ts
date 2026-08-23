import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

export const POLL_QUEUE = "netmon-poll";
export const CMDB_SYNC_QUEUE = "netmon-cmdb-sync";

export type CmdbSyncJob = {
  tenantId: string;
  ciId: string;
  op: "upsert" | "retire";
  snapshot?: {
    name: string;
    ci_type: string;
    asset_tag: string | null;
    serial: string | null;
    owner: string | null;
    location: string | null;
    status: string;
    hostname?: string | null;
    ip?: string | null;
  };
};

export function getPollQueue() {
  return new Queue(POLL_QUEUE, { connection: getRedis() });
}

export function getCmdbSyncQueue() {
  return new Queue(CMDB_SYNC_QUEUE, { connection: getRedis() });
}
