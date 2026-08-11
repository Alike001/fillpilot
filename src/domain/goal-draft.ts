import {
  positiveTokenAmount,
  timestampMs,
  type TimestampMs,
  type TokenAmount,
} from "./types";

export const USDC_DECIMALS = 6;
export const WETH_DECIMALS = 18;
export const CHECKPOINT_LEAD_TIME_MS = 5 * 60 * 1000;
export const MINIMUM_GOAL_DURATION_MS = 10 * 60 * 1000;

export type GoalDraftMarket = Readonly<{
  sellDecimals: number;
  buyDecimals: number;
}>;

export const BASE_GOAL_DRAFT_MARKET: GoalDraftMarket = {
  sellDecimals: USDC_DECIMALS,
  buyDecimals: WETH_DECIMALS,
};

export type GoalDraftInput = {
  deadline: string;
  minimumBuyAmount: string;
  preferredBuyAmount: string;
  sellAmount: string;
};

export type GoalDraft = {
  readonly checkpointAt: TimestampMs;
  readonly deadline: TimestampMs;
  readonly minimumBuyAmount: TokenAmount;
  readonly preferredBuyAmount: TokenAmount;
  readonly sellAmount: TokenAmount;
};

export function validateGoalDraft(
  input: GoalDraftInput,
  now = Date.now(),
  market: GoalDraftMarket = BASE_GOAL_DRAFT_MARKET,
): GoalDraft {
  const sellAmount = parseTokenAmount(
    input.sellAmount,
    market.sellDecimals,
    "Sell amount",
  );
  const preferredBuyAmount = parseTokenAmount(
    input.preferredBuyAmount,
    market.buyDecimals,
    "Preferred receive amount",
  );
  const minimumBuyAmount = parseTokenAmount(
    input.minimumBuyAmount,
    market.buyDecimals,
    "Minimum receive amount",
  );
  if (minimumBuyAmount > preferredBuyAmount) {
    throw new RangeError(
      "Minimum receive amount cannot exceed the preferred receive amount",
    );
  }

  const deadlineValue = Date.parse(input.deadline);
  if (!Number.isSafeInteger(deadlineValue)) {
    throw new RangeError("Deadline must be a valid date and time");
  }
  if (deadlineValue < now + MINIMUM_GOAL_DURATION_MS) {
    throw new RangeError("Deadline must be at least 10 minutes from now");
  }

  return {
    sellAmount,
    preferredBuyAmount,
    minimumBuyAmount,
    deadline: timestampMs(deadlineValue),
    checkpointAt: timestampMs(deadlineValue - CHECKPOINT_LEAD_TIME_MS),
  };
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const digits = amount.toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, -decimals) || "0";
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function parseTokenAmount(
  value: string,
  decimals: number,
  label: string,
): TokenAmount {
  const trimmed = value.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(trimmed);
  if (!match)
    throw new RangeError(`${label} must be a positive decimal amount`);

  const fraction = match[2] ?? "";
  if (fraction.length > decimals) {
    throw new RangeError(
      `${label} supports at most ${decimals} decimal places`,
    );
  }
  const raw = BigInt(`${match[1]}${fraction.padEnd(decimals, "0")}`);
  return positiveTokenAmount(raw);
}
