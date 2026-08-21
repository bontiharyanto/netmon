import { Worker } from "bullmq";
import { getRedis } from "@/lib/redis";
import { getPollQueue, POLL_QUEUE } from "@/lib/queue";
import { pollAllDevices } from "@/lib/poller";

async function start() {
  const connection = getRedis();
  const queue = getPollQueue();

  await queue.add("tick", {}, { repeat: { every: 60_000 }, removeOnComplete: 20 });

  const worker = new Worker(
    POLL_QUEUE,
    async () => {
      const results = await pollAllDevices();
      console.log(`[NETMON poller] checked ${results.length} devices`);
      return { count: results.length };
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`[NETMON poller] job ${job?.id} failed`, err);
  });

  console.log("[NETMON poller] worker started");
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
