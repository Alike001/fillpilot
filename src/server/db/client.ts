import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireDatabaseUrl } from "@/env";

import * as schema from "./schema";

export function createDatabase(url = requireDatabaseUrl()) {
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });

  return { client, db };
}

export type Database = ReturnType<typeof createDatabase>["db"];
