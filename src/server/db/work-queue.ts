import type { RetryReason } from "@/domain/work";
import {
  DEFAULT_WORK_LEASE_MS,
  type LeasedWork,
  type WorkQueue,
} from "@/worker/worker-cycle";

import { createDatabase } from "./client";

const MAX_WORK_ATTEMPTS = 5;

/**
 * PostgreSQL owns concurrency here. `FOR UPDATE SKIP LOCKED` makes a due row
 * visible to only one worker, while a previous worker's expired lease can be
 * recovered without a manual cleanup process.
 */
export class PostgresWorkQueue implements WorkQueue {
  async claimDue(
    now: Date,
    leaseMs = DEFAULT_WORK_LEASE_MS,
  ): Promise<LeasedWork | undefined> {
    if (!Number.isSafeInteger(leaseMs) || leaseMs <= 0) {
      throw new RangeError("Worker lease must be a positive safe integer");
    }
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    const { client } = createDatabase();
    try {
      const rows = await client<LeasedWork[]>`
        with candidate as (
          select id
          from work_items
          where due_at <= ${now}
            and (
              state = 'PENDING'
              or (state = 'LEASED' and lease_expires_at <= ${now})
            )
          order by due_at asc, created_at asc
          for update skip locked
          limit 1
        )
        update work_items
        set
          state = 'LEASED',
          lease_expires_at = ${leaseExpiresAt},
          updated_at = ${now}
        where id in (select id from candidate)
        returning id::text as id, kind, goal_id::text as "goalId"
      `;
      return rows[0];
    } finally {
      await client.end();
    }
  }

  async complete(workId: string): Promise<void> {
    const { client } = createDatabase();
    try {
      const rows = await client<{ id: string }[]>`
        update work_items
        set state = 'COMPLETE', lease_expires_at = null, updated_at = now()
        where id = ${workId}::uuid and state = 'LEASED'
        returning id::text as id
      `;
      if (!rows[0]) throw new Error("Only a currently leased job can complete");
    } finally {
      await client.end();
    }
  }

  async fail(workId: string, now: Date, reason: RetryReason): Promise<void> {
    const retryable =
      reason === "NETWORK" || reason === "RATE_LIMIT" || reason === "SERVER";
    const { client } = createDatabase();
    try {
      const rows = await client<{ id: string }[]>`
        update work_items
        set
          attempts = attempts + 1,
          state = case
            when ${retryable} and attempts + 1 < ${MAX_WORK_ATTEMPTS}
              then 'PENDING'::work_state
            else 'DEAD'::work_state
          end,
          due_at = case
            when ${retryable} and attempts + 1 < ${MAX_WORK_ATTEMPTS}
              then ${now} + (
                least(60000, 1000 * power(2, attempts)) * interval '1 millisecond'
              )
            else due_at
          end,
          lease_expires_at = null,
          last_error = ${JSON.stringify({ reason })}::jsonb,
          updated_at = ${now}
        where id = ${workId}::uuid and state = 'LEASED'
        returning id::text as id
      `;
      if (!rows[0]) throw new Error("Only a currently leased job can fail");
    } finally {
      await client.end();
    }
  }
}
