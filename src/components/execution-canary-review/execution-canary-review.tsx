"use client";

import { useState } from "react";

import styles from "./execution-canary-review.module.css";

type Review = {
  chainId: number;
  contract: string;
  function: string;
  calldata: string;
  challenge: string;
  value: string;
  expectedEvent: string;
  sourceRepository: string;
  boundary: string;
};

export function ExecutionCanaryReview() {
  const [review, setReview] = useState<Review>();
  const [message, setMessage] = useState(
    "No external canary call has been prepared.",
  );
  const [loading, setLoading] = useState<"review" | "simulation">();

  async function loadReview() {
    setLoading("review");
    try {
      const response = await fetch("/api/testnet/execution-canary/review", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        review?: Review;
        error?: string;
      };
      if (!response.ok || !payload.review) {
        setMessage(payload.error ?? "Canary review is unavailable.");
        return;
      }
      setReview(payload.review);
      setMessage(
        "Exact public-canary bytes are ready for read-only simulation.",
      );
    } catch {
      setMessage("FillPilot could not load the public-canary review.");
    } finally {
      setLoading(undefined);
    }
  }

  async function simulate() {
    setLoading("simulation");
    try {
      const response = await fetch("/api/testnet/execution-canary/simulate", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        simulation?: { status: string; gasEstimate?: string; reason?: string };
        error?: string;
        boundary?: string;
      };
      if (!response.ok || !payload.simulation) {
        setMessage(payload.error ?? "Canary simulation is unavailable.");
        return;
      }
      setMessage(
        payload.simulation.status === "simulated"
          ? `KeeperHub simulated the reviewed ping at ${payload.simulation.gasEstimate} gas. ${payload.boundary}`
          : `KeeperHub rejected the reviewed ping: ${payload.simulation.reason}. ${payload.boundary ?? ""}`,
      );
    } catch {
      setMessage("FillPilot could not reach the KeeperHub simulation route.");
    } finally {
      setLoading(undefined);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="execution-canary-title">
      <div className={styles.heading}>
        <div>
          <p>Execution proof path</p>
          <h2 id="execution-canary-title">Review one public testnet ping.</h2>
        </div>
        <span>Base Sepolia · zero value</span>
      </div>
      <p className={styles.intro}>
        This is separate from a CoW order. It proves that KeeperHub can execute
        a bounded, already-deployed testnet contract call when you choose to
        submit it later.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={loadReview}
          disabled={loading !== undefined}
        >
          {loading === "review" ? "Checking public code…" : "Review exact call"}
        </button>
        <button
          type="button"
          onClick={simulate}
          disabled={!review || loading !== undefined}
        >
          {loading === "simulation" ? "Simulating…" : "Simulate with KeeperHub"}
        </button>
      </div>
      {review ? (
        <dl className={styles.review}>
          <div>
            <dt>Contract</dt>
            <dd>{review.contract}</dd>
          </div>
          <div>
            <dt>Function</dt>
            <dd>{review.function}</dd>
          </div>
          <div>
            <dt>Value</dt>
            <dd>{review.value}</dd>
          </div>
          <div>
            <dt>Challenge</dt>
            <dd>{review.challenge}</dd>
          </div>
          <div>
            <dt>Calldata</dt>
            <dd>{review.calldata}</dd>
          </div>
          <div>
            <dt>Expected event</dt>
            <dd>{review.expectedEvent}</dd>
          </div>
        </dl>
      ) : null}
      <p className={styles.message} aria-live="polite">
        {message}
      </p>
      {review ? (
        <a href={review.sourceRepository} target="_blank" rel="noreferrer">
          Inspect the public canary source ↗
        </a>
      ) : null}
    </section>
  );
}
