import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { decryptSecret, encryptSecret } from "./crypto";
import type { ConnectionAuthState } from "./mcp-oauth";

const MAX_AGE_MS = 10 * 60 * 1000;
const STORE_DIRECTORY = join(tmpdir(), "fillpilot-oauth-attempts");

type StoredAttempt = {
  createdAt: number;
  state: ConnectionAuthState;
};

export async function createOAuthAttempt(
  state: ConnectionAuthState,
): Promise<string> {
  const id = randomUUID();
  await writeAttempt(id, { createdAt: Date.now(), state });
  return id;
}

export async function readOAuthAttempt(
  id: string,
): Promise<ConnectionAuthState | undefined> {
  if (!isAttemptId(id)) return undefined;

  try {
    const encrypted = await readFile(attemptPath(id), "utf8");
    const attempt = JSON.parse(decryptSecret(encrypted)) as StoredAttempt;
    if (Date.now() - attempt.createdAt > MAX_AGE_MS) {
      await unlink(attemptPath(id)).catch(() => undefined);
      return undefined;
    }
    return attempt.state;
  } catch {
    return undefined;
  }
}

export async function saveOAuthAttempt(
  id: string,
  state: ConnectionAuthState,
): Promise<void> {
  if (!isAttemptId(id)) throw new Error("Invalid OAuth attempt identifier");
  await writeAttempt(id, { createdAt: Date.now(), state });
}

async function writeAttempt(id: string, attempt: StoredAttempt): Promise<void> {
  await mkdir(STORE_DIRECTORY, { recursive: true, mode: 0o700 });
  await writeFile(attemptPath(id), encryptSecret(JSON.stringify(attempt)), {
    encoding: "utf8",
    mode: 0o600,
  });
}

function attemptPath(id: string): string {
  return join(STORE_DIRECTORY, `${id}.json`);
}

function isAttemptId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
