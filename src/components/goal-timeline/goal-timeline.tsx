"use client";
import { useEffect, useState } from "react";
import { formatTokenAmount } from "@/domain/goal-draft";
import styles from "./goal-timeline.module.css";

type Goal = {
  id: string;
  sellAmount: string;
  preferredBuyAmount: string;
  minimumBuyAmount: string;
  state: string;
  deadline: string;
  market: {
    network: string;
    sellSymbol: string;
    buySymbol: string;
    sellDecimals: number;
    buyDecimals: number;
  };
  latestExecution?: {
    state: string;
    executionId?: string;
    simulation?: { gasEstimate?: string; orderUid?: string };
    transactionHash?: string;
    transactionLink?: string;
    createdAt: string;
  };
};

function formatAmount(value: string, decimals: number): string {
  try {
    return formatTokenAmount(BigInt(value), decimals);
  } catch {
    return value;
  }
}

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
          <span className={styles.intent}>
            {goal.market.network} · sell{" "}
            {formatAmount(goal.sellAmount, goal.market.sellDecimals)}{" "}
            {goal.market.sellSymbol} · target{" "}
            {formatAmount(goal.preferredBuyAmount, goal.market.buyDecimals)}{" "}
            {goal.market.buySymbol} · floor{" "}
            {formatAmount(goal.minimumBuyAmount, goal.market.buyDecimals)}{" "}
            {goal.market.buySymbol}
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
          {execution?.simulation?.orderUid ? (
            <span className={styles.uid}>
              UID {execution.simulation.orderUid}
            </span>
          ) : null}
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
