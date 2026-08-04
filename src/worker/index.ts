import { sql } from "drizzle-orm";

import { createDatabase } from "@/server/db/client";

const HEARTBEAT_INTERVAL_MS = 30_000;

async function main() {
  const { client, db } = createDatabase();
  await db.execute(sql`select 1 as ready`);
  console.info(
    "FillPilot worker ready; lifecycle processing is not enabled yet.",
  );

  const heartbeat = setInterval(() => {
    console.info("FillPilot worker idle: foundation milestone.");
  }, HEARTBEAT_INTERVAL_MS);

  async function shutdown(signal: string) {
    clearInterval(heartbeat);
    console.info(`FillPilot worker stopping after ${signal}.`);
    await client.end();
    process.exit(0);
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("FillPilot worker failed to start.", error);
  process.exitCode = 1;
});
