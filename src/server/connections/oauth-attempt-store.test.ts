import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createOAuthAttempt,
  readOAuthAttempt,
  saveOAuthAttempt,
} from "./oauth-attempt-store";

const originalKey = process.env.TOKEN_ENCRYPTION_KEY;
const createdAttemptIds: string[] = [];

afterEach(async () => {
  process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  await Promise.all(
    createdAttemptIds
      .splice(0)
      .map((id) =>
        unlink(join(tmpdir(), "fillpilot-oauth-attempts", `${id}.json`)).catch(
          () => undefined,
        ),
      ),
  );
});

describe("OAuth attempt store", () => {
  it("persists encrypted OAuth state across independent reads", async () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

    const id = await createOAuthAttempt({
      redirectUrl: "http://127.0.0.1:3000/api/connections/keeperhub/callback",
      state: "state-before-callback",
      codeVerifier: "pkce-verifier",
    });
    createdAttemptIds.push(id);

    expect(await readOAuthAttempt(id)).toMatchObject({
      state: "state-before-callback",
      codeVerifier: "pkce-verifier",
    });

    await saveOAuthAttempt(id, {
      state: "state-after-callback",
      tokens: { access_token: "token", token_type: "Bearer" },
    });

    expect(await readOAuthAttempt(id)).toMatchObject({
      state: "state-after-callback",
      tokens: { access_token: "token" },
    });
  });
});
