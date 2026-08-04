import { createPublicClient, http, parseAbi, type Address } from "viem";
import { base } from "viem/chains";

export const BASE_CHAIN_ID = 8453;
export const BASE_USDC: Address = "0x833589fCD6EDB6E08f4c7C32D4f71b54bda02913";

const erc20ReadAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export function createBaseReader(rpcUrl?: string) {
  return createPublicClient({ chain: base, transport: http(rpcUrl) });
}

export async function readBaseWallet(
  wallet: Address,
  spender: Address,
  client = createBaseReader(),
) {
  const [nativeGasWei, usdcBalance, allowance] = await Promise.all([
    client.getBalance({ address: wallet }),
    client.readContract({
      address: BASE_USDC,
      abi: erc20ReadAbi,
      functionName: "balanceOf",
      args: [wallet],
    }),
    client.readContract({
      address: BASE_USDC,
      abi: erc20ReadAbi,
      functionName: "allowance",
      args: [wallet, spender],
    }),
  ]);

  return { nativeGasWei, usdcBalance, allowance };
}
