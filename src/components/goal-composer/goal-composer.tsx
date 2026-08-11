"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  formatTokenAmount,
  validateGoalDraft,
  type GoalDraftInput,
} from "@/domain/goal-draft";

import styles from "./goal-composer.module.css";

const INITIAL_INPUT: GoalDraftInput = {
  sellAmount: "",
  preferredBuyAmount: "",
  minimumBuyAmount: "",
  deadline: "",
};

type GoalMarket = {
  network: string;
  sellSymbol: string;
  buySymbol: string;
  sellDecimals: number;
  buyDecimals: number;
};

export function GoalComposer({ market }: { market: GoalMarket }) {
  const [input, setInput] = useState<GoalDraftInput>(INITIAL_INPUT);
  const [submitted, setSubmitted] = useState(false);
  const [savedGoalId, setSavedGoalId] = useState<string>();
  const [saveStatus, setSaveStatus] = useState<string>();

  const validation = useMemo(() => {
    try {
      return {
        draft: validateGoalDraft(input, Date.now(), market),
        error: undefined,
      };
    } catch (error) {
      return {
        draft: undefined,
        error:
          error instanceof Error ? error.message : "Goal inputs are invalid",
      };
    }
  }, [input, market]);

  function update(field: keyof GoalDraftInput, value: string) {
    setSubmitted(false);
    setSavedGoalId(undefined);
    setSaveStatus(undefined);
    setInput((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className={styles.composer} aria-labelledby="goal-composer-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>01 / Define the outcome</p>
          <h2 id="goal-composer-title">
            One protected fill, one chance to adapt.
          </h2>
        </div>
        <span className={styles.network}>{market.network}</span>
      </div>

      <div className={styles.layout}>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className={styles.lockedPair}>
            <span>Sell</span>
            <strong>{market.sellSymbol}</strong>
            <span aria-hidden="true">→</span>
            <strong>{market.buySymbol}</strong>
            <span>Receive</span>
          </div>

          <label>
            <span>Sell amount</span>
            <div className={styles.inputWrap}>
              <input
                inputMode="decimal"
                name="sellAmount"
                onChange={(event) => update("sellAmount", event.target.value)}
                placeholder="0.00"
                value={input.sellAmount}
              />
              <b>{market.sellSymbol}</b>
            </div>
          </label>

          <label>
            <span>Preferred receive amount</span>
            <div className={styles.inputWrap}>
              <input
                inputMode="decimal"
                name="preferredBuyAmount"
                onChange={(event) =>
                  update("preferredBuyAmount", event.target.value)
                }
                placeholder="0.000000"
                value={input.preferredBuyAmount}
              />
              <b>{market.buySymbol}</b>
            </div>
            <small>This is the first order’s target.</small>
          </label>

          <label>
            <span>Minimum receive amount</span>
            <div className={styles.inputWrap}>
              <input
                inputMode="decimal"
                name="minimumBuyAmount"
                onChange={(event) =>
                  update("minimumBuyAmount", event.target.value)
                }
                placeholder="0.000000"
                value={input.minimumBuyAmount}
              />
              <b>{market.buySymbol}</b>
            </div>
            <small>FillPilot never replaces below this floor.</small>
          </label>

          <label>
            <span>Deadline</span>
            <input
              name="deadline"
              onChange={(event) => update("deadline", event.target.value)}
              type="datetime-local"
              value={input.deadline}
            />
            <small>At least 10 minutes from now.</small>
          </label>

          <button className={styles.validate} type="submit">
            Validate execution plan
          </button>
          <button
            className={styles.validate}
            disabled={!validation.draft}
            onClick={async () => {
              if (!validation.draft) return;
              setSaveStatus("Saving draft goal…");
              try {
                const response = await fetch("/api/goals", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(input),
                });
                const body = (await response.json()) as {
                  error?: string;
                  id?: string;
                };
                if (response.ok && body.id) {
                  setSavedGoalId(body.id);
                  setSaveStatus(
                    "Draft saved. No order or transaction was created.",
                  );
                } else {
                  setSaveStatus(body.error ?? "Could not save draft.");
                }
              } catch {
                setSaveStatus(
                  "Could not reach FillPilot. Your goal was not saved.",
                );
              }
            }}
            type="button"
          >
            Save draft goal
          </button>
          <p className={styles.status} aria-live="polite" role="status">
            {saveStatus ??
              (submitted && validation.draft
                ? "Inputs are valid. No goal, quote, authorization, or transaction has been created."
                : submitted
                  ? validation.error
                  : "Validation is local and exact-value only.")}
          </p>
          {savedGoalId ? (
            <Link
              className={styles.openGoal}
              href={`/app/goals/${savedGoalId}`}
            >
              Open saved goal
            </Link>
          ) : null}
        </form>

        <aside className={styles.preview} aria-live="polite">
          <p className={styles.eyebrow}>Execution preview</p>
          {validation.draft ? (
            <>
              <dl>
                <div>
                  <dt>Initial order target</dt>
                  <dd>
                    {formatTokenAmount(
                      validation.draft.preferredBuyAmount,
                      market.buyDecimals,
                    )}{" "}
                    {market.buySymbol}
                  </dd>
                </div>
                <div>
                  <dt>Protected floor</dt>
                  <dd>
                    {formatTokenAmount(
                      validation.draft.minimumBuyAmount,
                      market.buyDecimals,
                    )}{" "}
                    {market.buySymbol}
                  </dd>
                </div>
                <div>
                  <dt>Checkpoint</dt>
                  <dd>
                    {new Date(
                      Number(validation.draft.checkpointAt),
                    ).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <ol>
                <li>Request a fresh CoW quote at the fixed checkpoint.</li>
                <li>Replace only if it meets your exact floor.</li>
                <li>At most one replacement; no hidden second chance.</li>
              </ol>
            </>
          ) : (
            <p className={styles.placeholder}>
              Add valid amounts and a deadline to inspect the deterministic
              plan.
            </p>
          )}
          <div className={styles.boundary}>
            <strong>Current boundary</strong>
            <p>
              This screen only saves a draft. Quote and KeeperHub simulation
              controls become available from its saved goal page. No order,
              approval, or transaction is created here.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
