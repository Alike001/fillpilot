import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptSecret } from "../../src/server/connections/crypto";
import { saveDraftGoal } from "../../src/server/db/repository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
let client: ReturnType<typeof postgres> | undefined;

describeWithDatabase("draft goal persistence", () => {
  beforeAll(() => {
    client = postgres(databaseUrl as string, { max: 1 });
  });

  afterAll(async () => {
    await client?.end();
  });

  it("encrypts the connection and persists exact Base goal amounts", async () => {
    const walletAddress = "0x1111111111111111111111111111111111111111" as const;
    const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const saved = await saveDraftGoal(
      {
        walletAddress,
        tokens: { access_token: "test-access-token", token_type: "Bearer" },
      },
      {
        sellAmount: "12.345678",
        preferredBuyAmount: "0.00456789",
        minimumBuyAmount: "0.004",
        deadline,
      },
    );

    const [row] = await client!<
      {
        sell_amount: string;
        preferred_buy_amount: string;
        minimum_buy_amount: string;
        encrypted_tokens: string;
      }[]
    >`
      select g.sell_amount, g.preferred_buy_amount, g.minimum_buy_amount,
             c.encrypted_tokens
      from goals g
      join connections c on c.id = g.connection_id
      where g.id = ${saved.id}
    `;

    expect(row).toMatchObject({
      sell_amount: "12345678",
      preferred_buy_amount: "4567890000000000",
      minimum_buy_amount: "4000000000000000",
    });
    expect(decryptSecret(row.encrypted_tokens)).toContain("test-access-token");

    await client!`delete from goals where id = ${saved.id}`;
    await client!`delete from connections where wallet_address = ${walletAddress}`;
  });
});
