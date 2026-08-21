import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

export const POLL_QUEUE = "netmon-poll";

export function getPollQueue() {
  return new Queue(POLL_QUEUE, { connection: getRedis() });
}
