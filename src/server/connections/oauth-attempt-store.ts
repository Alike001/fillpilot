import { randomUUID } from "node:crypto";

import type { ConnectionAuthState } from "./mcp-oauth";

const MAX_AGE_MS = 10 * 60 * 1000;
const attempts = new Map<
  string,
  { createdAt: number; state: ConnectionAuthState }
>();

export function createOAuthAttempt(state: ConnectionAuthState): string {
  pruneExpiredAttempts();
  const id = randomUUID();
  attempts.set(id, { createdAt: Date.now(), state });
  return id;
}

export function readOAuthAttempt(id: string): ConnectionAuthState | undefined {
  const attempt = attempts.get(id);
  if (!attempt || Date.now() - attempt.createdAt > MAX_AGE_MS) {
    attempts.delete(id);
    return undefined;
  }
  return attempt.state;
}

function pruneExpiredAttempts() {
  for (const [id, attempt] of attempts) {
    if (Date.now() - attempt.createdAt > MAX_AGE_MS) attempts.delete(id);
  }
}
