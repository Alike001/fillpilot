"use client";

import { useEffect, useState } from "react";

import styles from "./authorization-review.module.css";

const SETTLEMENT = "0x9008D19f58AAbD9eD0D60971565AA8510560ab41";

type Goal = {
  id: string;
  market: { sellSymbol: string; network: string };
  latestExecution?: {
    simulation?: { gasEstimate?: string; orderUid?: string };
  };
};

export function AuthorizationReview({ goalId }: { goalId: string }) {
  const [goal, setGoal] = useState<Goal>();
  useEffect(() => {
    const load = () => {
      void fetch("/api/goals/history")
        .then(async (response) => ({
          body: (await response.json()) as { goals?: Goal[] },
          response,
        }))
        .then(({ body, response }) => {
          if (response.ok)
            setGoal(body.goals?.find((item) => item.id === goalId));
        });
    };
    const onEvidenceUpdated = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.goalId === goalId)
        load();
    };
    load();
    window.addEventListener("fillpilot:evidence-updated", onEvidenceUpdated);
    return () =>
      window.removeEventListener(
        "fillpilot:evidence-updated",
        onEvidenceUpdated,
      );
  }, [goalId]);

  const simulation = goal?.latestExecution?.simulation;
  if (!goal || !simulation?.orderUid || !simulation.gasEstimate) {
    return (
      <section className={styles.pending} aria-label="Authorization review">
        <strong>Authorization review remains locked.</strong>
        <p>
          Run a successful safe simulation after this update to save the exact
          order UID and gas estimate for operator review.
        </p>
      </section>
    );
  }
  return (
    <section className={styles.review} aria-labelledby="authorization-title">
      <div className={styles.heading}>
        <div>
          <p>04 / Operator review</p>
          <h2 id="authorization-title">One exact authorization, held.</h2>
        </div>
        <span>Server locked</span>
      </div>
      <dl>
        <div>
          <dt>Function</dt>
          <dd>setPreSignature(orderUid, true)</dd>
        </div>
        <div>
          <dt>Settlement contract</dt>
          <dd>{SETTLEMENT}</dd>
        </div>
        <div>
          <dt>Order UID</dt>
          <dd>{simulation.orderUid}</dd>
        </div>
        <div>
          <dt>KeeperHub simulation</dt>
          <dd>{simulation.gasEstimate} gas · would-revert check passed</dd>
        </div>
      </dl>
      <p className={styles.boundary}>
        This call only authorizes the CoW order UID. It does not post an order,
        approve {goal.market.sellSymbol}, or sell assets. The server rejects it
        until a separate operator approval enables {goal.market.network} writes.
      </p>
    </section>
  );
}
