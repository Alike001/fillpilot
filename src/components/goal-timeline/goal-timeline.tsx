"use client";
import { useEffect, useState } from "react";
import styles from "./goal-timeline.module.css";

type Goal = {
  id: string;
  state: string;
  deadline: string;
  latestExecution?: {
    state: string;
    executionId?: string;
    simulation?: { gasEstimate?: string };
    transactionHash?: string;
    transactionLink?: string;
    createdAt: string;
  };
};

export function GoalTimeline({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<Goal>();
  const [error, setError] = useState<string>();
  const [receiptStatus, setReceiptStatus] = useState<string>();
  useEffect(() => {
    const load = () => {
      void fetch("/api/goals/history")
        .then(async (r) => ({
          r,
          b: (await r.json()) as { goals?: Goal[]; error?: string },
        }))
        .then(({ r, b }) => {
          if (!r.ok) setError(b.error);
          else {
            setError(undefined);
            setGoal(b.goals?.find((x) => x.id === goalId));
          }
        })
        .catch(() => setError("Timeline unavailable."));
    };
    const onEvidenceUpdated = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.goalId === goalId) {
        load();
      }
    };
    load();
    window.addEventListener("fillpilot:evidence-updated", onEvidenceUpdated);
    return () =>
      window.removeEventListener(
        "fillpilot:evidence-updated",
        onEvidenceUpdated,
      );
  }, [goalId]);
  if (error) return <p className={styles.empty}>{error}</p>;
  if (!goal) return <p className={styles.empty}>Reading execution evidence…</p>;
  const gas = goal.latestExecution?.simulation?.gasEstimate;
  const execution = goal.latestExecution;
  async function refreshReceipt() {
    if (!execution?.executionId) return;
    setReceiptStatus("Reading KeeperHub receipt…");
    try {
      const response = await fetch(
        `/api/goals/${goalId}/executions/${encodeURIComponent(execution.executionId)}`,
      );
      const body = (await response.json()) as {
        state?: string;
        transactionHash?: string;
        error?: string;
      };
      setReceiptStatus(
        response.ok
          ? body.transactionHash
            ? `${body.state}: verified transaction ${body.transactionHash}`
            : `${body.state ?? "Submitted"}: no verified transaction receipt yet.`
          : (body.error ?? "Receipt could not be read."),
      );
    } catch {
      setReceiptStatus("Receipt could not be read.");
    }
  }
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
          {execution?.executionId ? (
            <button
              className={styles.receiptButton}
              onClick={refreshReceipt}
              type="button"
            >
              Refresh receipt
            </button>
          ) : null}
          {receiptStatus ? (
            <span className={styles.receipt}>{receiptStatus}</span>
          ) : null}
        </div>
      </div>
      <div className={styles.stage}>
        <b>04</b>
        <div>
          <strong>Onchain authorization</strong>
          <span>
            {execution?.transactionHash
              ? "Recorded separately from simulation."
              : "Guarded — not created."}
          </span>
        </div>
      </div>
    </section>
  );
}
