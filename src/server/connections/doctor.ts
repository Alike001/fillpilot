export type DoctorInput = {
  connection: "disconnected" | "connected";
  walletAddress?: string;
  chainId?: number;
  nativeGasWei?: bigint;
  usdcBalance?: bigint;
  allowance?: bigint;
  requiredSellAmount?: bigint;
};

export type DoctorCheck = {
  id: "connection" | "wallet" | "chain" | "gas" | "usdc" | "allowance";
  label: string;
  state: "ready" | "attention" | "unavailable";
  detail: string;
};

const BASE_CHAIN_ID = 8453;
const MINIMUM_GAS_WEI = 100_000_000_000_000n;

export function buildConnectionDoctor(input: DoctorInput): DoctorCheck[] {
  const connected = input.connection === "connected";
  const hasWallet = Boolean(input.walletAddress);
  const correctChain = input.chainId === BASE_CHAIN_ID;
  const canInspect = connected && hasWallet && correctChain;

  return [
    {
      id: "connection",
      label: "KeeperHub connection",
      state: connected ? "ready" : "attention",
      detail: connected
        ? "Read-only organization connection is active."
        : "Connect KeeperHub to inspect an organization wallet.",
    },
    {
      id: "wallet",
      label: "Organization wallet",
      state: hasWallet ? "ready" : connected ? "attention" : "unavailable",
      detail: hasWallet
        ? input.walletAddress!
        : "No wallet was returned by the connected organization.",
    },
    {
      id: "chain",
      label: "Base mainnet",
      state:
        connected && input.chainId === BASE_CHAIN_ID
          ? "ready"
          : connected
            ? "attention"
            : "unavailable",
      detail:
        input.chainId === undefined
          ? "Chain is unavailable."
          : `Reported chain: ${input.chainId}.`,
    },
    balanceCheck(
      "gas",
      "Native gas reserve",
      input.nativeGasWei,
      MINIMUM_GAS_WEI,
      canInspect,
    ),
    balanceCheck(
      "usdc",
      "USDC balance",
      input.usdcBalance,
      input.requiredSellAmount ?? 1n,
      canInspect,
    ),
    balanceCheck(
      "allowance",
      "CoW allowance",
      input.allowance,
      input.requiredSellAmount ?? 1n,
      canInspect,
    ),
  ];
}

function balanceCheck(
  id: "gas" | "usdc" | "allowance",
  label: string,
  current: bigint | undefined,
  minimum: bigint,
  canInspect: boolean,
): DoctorCheck {
  if (!canInspect || current === undefined) {
    return {
      id,
      label,
      state: "unavailable",
      detail: "Connect a Base organization wallet to inspect this value.",
    };
  }

  return current >= minimum
    ? { id, label, state: "ready", detail: "Read-only check passed." }
    : {
        id,
        label,
        state: "attention",
        detail: "Below the minimum needed for the selected goal.",
      };
}
