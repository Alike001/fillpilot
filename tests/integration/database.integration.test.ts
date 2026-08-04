import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
let client: ReturnType<typeof postgres> | undefined;

describeWithDatabase("PostgreSQL migration", () => {
  beforeAll(() => {
    client = postgres(databaseUrl as string, { max: 1 });
  });

  afterAll(async () => {
    await client?.end();
  });

  it("creates every durable foundation table", async () => {
    const rows = await client!<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    const names = rows.map((row) => row.table_name);

    expect(names).toEqual(
      expect.arrayContaining([
        "connections",
        "decisions",
        "events",
        "goals",
        "keeperhub_executions",
        "orders",
        "work_items",
      ]),
    );
  });
});
