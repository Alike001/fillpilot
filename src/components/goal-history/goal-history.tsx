"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./goal-history.module.css";

type Goal = {
  id: string;
  sellAmount: string;
  minimumBuyAmount: string;
  deadline: string;
  state: string;
  latestExecution?: { state: string; simulation?: { gasEstimate?: string } };
};

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
          <div>
            <strong>USDC → WETH</strong>
            <span>
              {goal.sellAmount} atomic USDC · floor {goal.minimumBuyAmount} wei
              WETH
            </span>
          </div>
          <div>
            <small>Goal</small>
            <b>{goal.state}</b>
          </div>
          <div>
            <small>KeeperHub</small>
            <b>
              {goal.latestExecution
                ? `${goal.latestExecution.state}${goal.latestExecution.simulation?.gasEstimate ? ` · ${goal.latestExecution.simulation.gasEstimate} gas` : ""}`
                : "Not simulated"}
            </b>
          </div>
          <div>
            <small>Deadline</small>
            <b>{new Date(goal.deadline).toLocaleString()}</b>
          </div>
        </Link>
      ))}
    </div>
  );
}
