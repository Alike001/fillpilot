"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTokenAmount } from "@/domain/goal-draft";
import styles from "./goal-history.module.css";

type Goal = {
  id: string;
  sellAmount: string;
  minimumBuyAmount: string;
  deadline: string;
  state: string;
  market: {
    sellSymbol: string;
    buySymbol: string;
    sellDecimals: number;
    buyDecimals: number;
  };
  latestExecution?: { state: string; simulation?: { gasEstimate?: string } };
};

function formatAmount(value: string, decimals: number): string {
  try {
    return formatTokenAmount(BigInt(value), decimals);
  } catch {
    return value;
  }
}

export function GoalHistory() {
  const [state, setState] = useState<{ goals?: Goal[]; error?: string }>({});
  useEffect(() => {
    void fetch("/api/goals/history")
      .then(async (response) => ({
        response,
        body: (await response.json()) as { goals?: Goal[]; error?: string },
      }))
      .then(({ response, body }) =>
        setState(
          response.ok
            ? { goals: body.goals ?? [] }
            : { error: body.error ?? "Could not load goals." },
        ),
      )
      .catch(() => setState({ error: "Could not load goals." }));
  }, []);
  if (state.error) return <p className={styles.empty}>{state.error}</p>;
  if (!state.goals)
    return <p className={styles.empty}>Reading durable goal history…</p>;
  if (state.goals.length === 0)
    return (
      <p className={styles.empty}>
        No saved goals for this connected organization.
      </p>
    );
  return (
    <div className={styles.list}>
      {state.goals.map((goal) => (
        <Link
          className={styles.row}
          href={`/app/goals/${goal.id}`}
          key={goal.id}
        >
          <div className={styles.intent}>
            <span className={styles.index}>Goal {goal.id.slice(0, 8)}</span>
            <strong>
              {formatAmount(goal.sellAmount, goal.market.sellDecimals)}{" "}
              {goal.market.sellSymbol} → {goal.market.buySymbol}
            </strong>
            <span>
              Protected floor{" "}
              {formatAmount(goal.minimumBuyAmount, goal.market.buyDecimals)}{" "}
              {goal.market.buySymbol}
            </span>
          </div>
          <div>
            <small>Lifecycle</small>
            <b className={styles.state}>{goal.state.toLowerCase()}</b>
          </div>
          <div>
            <small>KeeperHub</small>
            <b className={goal.latestExecution ? styles.evidence : undefined}>
              {goal.latestExecution
                ? `${goal.latestExecution.state}${goal.latestExecution.simulation?.gasEstimate ? ` · ${goal.latestExecution.simulation.gasEstimate} gas` : ""}`
                : "Not simulated"}
            </b>
          </div>
          <div>
            <small>Deadline</small>
            <b>{new Date(goal.deadline).toLocaleString()}</b>
            <span className={styles.outcome}>No onchain authorization yet</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
