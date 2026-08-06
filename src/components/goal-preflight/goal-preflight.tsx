"use client";
import { useState } from "react";
import styles from "./goal-preflight.module.css";
export function GoalPreflight({ goalId }: { goalId: string }) {
  const [message, setMessage] = useState("No quote requested.");
  const [quoteEligible, setQuoteEligible] = useState(false);
  async function requestQuote() {
    setMessage("Reading quote…");
    setQuoteEligible(false);
    try {
      const response = await fetch(`/api/goals/${goalId}/preflight`);
      const body = (await response.json()) as {
        buyAmount?: string;
        error?: string;
        boundary?: string;
      };
      if (response.ok) {
        setQuoteEligible(true);
        setMessage(
          `Floor is met: ${body.buyAmount} wei WETH. ${body.boundary}`,
        );
      } else {
        setMessage(body.error ?? "Quote unavailable.");
      }
    } catch {
      setMessage("FillPilot could not reach the quote route.");
    }
  }

  async function simulatePresignature() {
    setMessage("KeeperHub is simulating the exact pre-signature call…");
    try {
      const response = await fetch(`/api/goals/${goalId}/presign-simulation`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        orderUid?: string;
        simulation?:
          | { status: "simulated"; gasEstimate: string }
          | {
              status: "rejected";
              reason: string;
            };
        error?: string;
        boundary?: string;
      };
      if (!response.ok || !body.simulation) {
        setMessage(body.error ?? "Simulation unavailable.");
        return;
      }
      setMessage(
        body.simulation.status === "simulated"
          ? `Simulated: ${body.simulation.gasEstimate} gas. Order UID ${body.orderUid}. ${body.boundary}`
          : `Simulation rejected: ${body.simulation.reason}. ${body.boundary}`,
      );
      if (body.simulation.status === "simulated") {
        window.dispatchEvent(
          new CustomEvent("fillpilot:evidence-updated", {
            detail: { goalId },
          }),
        );
      }
    } catch {
      setMessage("FillPilot could not reach the simulation route.");
    }
  }
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <h2>Inspect a fresh CoW quote.</h2>
          <p>Check the saved WETH floor before doing anything else.</p>
        </div>
        <span className={styles.label}>Read + simulate only</span>
      </div>
      <div className={styles.controls}>
        <button className={styles.button} onClick={requestQuote} type="button">
          Request fresh CoW quote
        </button>
        <button
          className={styles.button}
          disabled={!quoteEligible}
          onClick={simulatePresignature}
          type="button"
        >
          Simulate CoW pre-signature with KeeperHub
        </button>
      </div>
      <p className={styles.boundary}>
        This checks the exact Base contract call. It cannot sign, submit an
        order, approve USDC, or send a transaction.
      </p>
      <p aria-live="polite" className={styles.result} role="status">
        {message}
      </p>
    </section>
  );
}
