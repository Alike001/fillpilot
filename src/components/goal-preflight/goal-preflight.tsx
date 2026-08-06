"use client";
import { useState } from "react";
export function GoalPreflight({ goalId }: { goalId: string }) {
  const [message, setMessage] = useState("No quote requested.");
  async function requestQuote() {
    setMessage("Reading quote…");
    try {
      const response = await fetch(`/api/goals/${goalId}/preflight`);
      const body = (await response.json()) as {
        buyAmount?: string;
        error?: string;
        boundary?: string;
      };
      setMessage(
        response.ok
          ? `Floor is met: ${body.buyAmount} wei WETH. ${body.boundary}`
          : (body.error ?? "Quote unavailable."),
      );
    } catch {
      setMessage("FillPilot could not reach the quote route.");
    }
  }
  return (
    <section>
      <h2>Inspect a fresh CoW quote.</h2>
      <p>Checks your saved WETH floor. It cannot place an order.</p>
      <button onClick={requestQuote} type="button">
        Request fresh CoW quote
      </button>
      <p aria-live="polite" role="status">
        {message}
      </p>
    </section>
  );
}
