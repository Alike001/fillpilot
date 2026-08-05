"use client";

import { useMemo, useState } from "react";

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

export function GoalComposer() {
  const [input, setInput] = useState<GoalDraftInput>(INITIAL_INPUT);
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(() => {
    try {
      return { draft: validateGoalDraft(input), error: undefined };
    } catch (error) {
      return {
        draft: undefined,
        error:
          error instanceof Error ? error.message : "Goal inputs are invalid",
      };
    }
  }, [input]);

  function update(field: keyof GoalDraftInput, value: string) {
    setSubmitted(false);
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
        <span className={styles.network}>Base mainnet</span>
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
            <strong>USDC</strong>
            <span aria-hidden="true">→</span>
            <strong>WETH</strong>
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
              <b>USDC</b>
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
              <b>WETH</b>
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
              <b>WETH</b>
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
          <p className={styles.status} aria-live="polite" role="status">
            {submitted && validation.draft
              ? "Inputs are valid. No goal, quote, authorization, or transaction has been created."
              : submitted
                ? validation.error
                : "Validation is local and exact-value only."}
          </p>
        </form>

        <aside className={styles.preview} aria-live="polite">
          <p className={styles.eyebrow}>Execution preview</p>
          {validation.draft ? (
            <>
              <dl>
                <div>
                  <dt>Initial order target</dt>
                  <dd>
                    {formatTokenAmount(validation.draft.preferredBuyAmount, 18)}{" "}
                    WETH
                  </dd>
                </div>
                <div>
                  <dt>Protected floor</dt>
                  <dd>
                    {formatTokenAmount(validation.draft.minimumBuyAmount, 18)}{" "}
                    WETH
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
              This slice validates intent only. Quotes, approvals, KeeperHub
              simulations, CoW orders, and Base transactions remain disabled.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
