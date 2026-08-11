import { PostgresCheckpointStore } from "@/server/db/checkpoint-store";
import { PostgresWorkQueue } from "@/server/db/work-queue";

import { CheckpointHandler } from "./checkpoint-handler";
import {
  CowFreshQuoteReader,
  CowOrderStatusReader,
} from "./cow-checkpoint-sources";
import { runWorkerCycle } from "./worker-cycle";

/**
 * The composition root has only read dependencies plus durable evidence
 * storage. It intentionally exports a single cycle and is not started by the
 * worker process until a posted-order activation policy is approved.
 */
export function createCheckpointRuntime() {
  const store = new PostgresCheckpointStore();
  const handler = new CheckpointHandler(
    store,
    new CowOrderStatusReader(),
    new CowFreshQuoteReader(),
    store,
  );
  const queue = new PostgresWorkQueue();

  return {
    runOnce(now = new Date()) {
      return runWorkerCycle(queue, handler, now);
    },
  };
}
