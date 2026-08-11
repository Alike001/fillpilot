"use client";

import { useState } from "react";

import { formatTokenAmount } from "@/domain/goal-draft";

import styles from "./goal-preflight.module.css";

function formatToken(value: string, decimals: number): string {
  try {
    return formatTokenAmount(BigInt(value), 18);
  } catch {
    return value;
  }
}

export function GoalPreflight({ goalId }: { goalId: string }) {
  const [message, setMessage] = useState("No quote requested.");
  const [quoteEligible, setQuoteEligible] = useState(false);
  const [activeStep, setActiveStep] = useState<"quote" | "simulation">();

  async function requestQuote() {
    if (activeStep) return;
    setActiveStep("quote");
    setMessage("Reading quote…");
    setQuoteEligible(false);
    try {
      const response = await fetch(`/api/goals/${goalId}/preflight`);
      const body = (await response.json()) as {
        buyAmount?: string;
        error?: string;
        boundary?: string;
        market?: { buySymbol: string; buyDecimals: number; network: string };
      };
      if (response.ok) {
        setQuoteEligible(true);
        setMessage(
          `Fresh ${body.market?.network ?? "saved-goal"} quote meets your protected floor: ${formatToken(body.buyAmount ?? "0", body.market?.buyDecimals ?? 18)} ${body.market?.buySymbol ?? "tokens"}. ${body.boundary}`,
        );
      } else {
        setMessage(body.error ?? "Quote unavailable.");
      }
    } catch {
      setMessage("FillPilot could not reach the quote route.");
    } finally {
      setActiveStep(undefined);
    }
  }

  async function simulatePresignature() {
    if (activeStep || !quoteEligible) return;
    setActiveStep("simulation");
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
    } finally {
      setActiveStep(undefined);
    }
  }
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <h2>Inspect a fresh CoW quote.</h2>
          <p>
            Check the saved goal’s protected floor before doing anything else.
          </p>
        </div>
        <span className={styles.label}>Read + simulate only</span>
      </div>
      <div className={styles.controls}>
        <button
          className={styles.button}
          disabled={Boolean(activeStep)}
          onClick={requestQuote}
          type="button"
        >
          {activeStep === "quote"
            ? "Reading fresh CoW quote…"
            : "Request fresh CoW quote"}
        </button>
        <button
          className={styles.button}
          disabled={!quoteEligible || Boolean(activeStep)}
          onClick={simulatePresignature}
          type="button"
        >
          {activeStep === "simulation"
            ? "Simulating with KeeperHub…"
            : "Simulate CoW pre-signature with KeeperHub"}
        </button>
      </div>
      <p className={styles.boundary}>
        This checks the saved goal’s exact contract call. It cannot sign, submit
        an order, approve tokens, or send a transaction.
      </p>
      <p aria-live="polite" className={styles.result} role="status">
        {message}
      </p>
    </section>
  );
}
