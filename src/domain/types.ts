declare const brand: unique symbol;

type Brand<Value, Name extends string> = Value & {
  readonly [brand]: Name;
};

export type TokenAmount = Brand<bigint, "TokenAmount">;
export type TimestampMs = Brand<number, "TimestampMs">;
export type OrderUid = Brand<string, "OrderUid">;
export type ExecutionId = Brand<string, "ExecutionId">;
export type HexHash = Brand<string, "HexHash">;

export function tokenAmount(value: bigint): TokenAmount {
  if (value < 0n) throw new RangeError("Token amounts cannot be negative");
  return value as TokenAmount;
}

export function positiveTokenAmount(value: bigint): TokenAmount {
  if (value <= 0n) throw new RangeError("Token amounts must be positive");
  return value as TokenAmount;
}

export function timestampMs(value: number): TimestampMs {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Timestamps must be non-negative safe integers");
  }
  return value as TimestampMs;
}

export function orderUid(value: string): OrderUid {
  if (!/^0x[\da-fA-F]{112}$/.test(value)) {
    throw new TypeError("Order UID must be a 56-byte hexadecimal value");
  }
  return value as OrderUid;
}

export function executionId(value: string): ExecutionId {
  if (value.trim().length === 0)
    throw new TypeError("Execution ID is required");
  return value as ExecutionId;
}

export function hexHash(value: string): HexHash {
  if (!/^0x[\da-fA-F]{64}$/.test(value)) {
    throw new TypeError("Hash must be a 32-byte hexadecimal value");
  }
  return value as HexHash;
}
