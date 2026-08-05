import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "./client";

config({ path: ".env.local", quiet: true });

async function main() {
  const { client, db } = createDatabase();

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.info("FillPilot database migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("FillPilot database migration failed.", error);
  process.exitCode = 1;
});
