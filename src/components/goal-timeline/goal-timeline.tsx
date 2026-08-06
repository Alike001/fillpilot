"use client";
import { useEffect, useState } from "react";
import styles from "./goal-timeline.module.css";

type Goal = {
  id: string;
  state: string;
  deadline: string;
  latestExecution?: {
    state: string;
    simulation?: { gasEstimate?: string };
    createdAt: string;
  };
};

export function GoalTimeline({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<Goal>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    void fetch("/api/goals/history")
      .then(async (r) => ({
        r,
        b: (await r.json()) as { goals?: Goal[]; error?: string },
      }))
      .then(({ r, b }) => {
        if (!r.ok) setError(b.error);
        else setGoal(b.goals?.find((x) => x.id === goalId));
      })
      .catch(() => setError("Timeline unavailable."));
  }, [goalId]);
  if (error) return <p className={styles.empty}>{error}</p>;
  if (!goal) return <p className={styles.empty}>Reading execution evidence…</p>;
  const gas = goal.latestExecution?.simulation?.gasEstimate;
  return (
    <section className={styles.timeline} aria-label="Execution timeline">
      <div className={styles.stage}>
        <b>01</b>
        <div>
          <strong>Goal saved</strong>
          <span>
            Draft · deadline {new Date(goal.deadline).toLocaleString()}
          </span>
        </div>
      </div>
      <div className={styles.stage}>
        <b>02</b>
        <div>
          <strong>Quote boundary</strong>
          <span>Fresh quote is requested only on demand.</span>
        </div>
      </div>
      <div className={styles.stage}>
        <b>03</b>
        <div>
          <strong>
            KeeperHub {goal.latestExecution?.state ?? "not simulated"}
          </strong>
          <span>
            {gas
              ? `${gas} gas · simulation only`
              : "No execution evidence yet."}
          </span>
        </div>
      </div>
      <div className={styles.stage}>
        <b>04</b>
        <div>
          <strong>Onchain authorization</strong>
          <span>Guarded — not created.</span>
        </div>
      </div>
    </section>
  );
}
