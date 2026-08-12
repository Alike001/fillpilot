export const VERIFIED_TESTNET_PROOF = {
  id: "base-sepolia-canary-20260812",
  network: "Base Sepolia",
  chainId: 84532,
  executionId: "dpnxfa52zwzoz58pod0f4",
  transactionHash:
    "0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa",
  transactionLink:
    "https://sepolia.basescan.org/tx/0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa",
  canaryContract: "0x2A6FC8182Bf9928Ef7517dA980dC79e8107c555A",
  organizationWallet: "0x7B67e63d6346F64C453315cFFFE827dA4EAFFDb5",
  function: "ping(bytes32)",
  value: "0 ETH",
  gasUsed: "72,965",
  receiptStatus: "Succeeded",
  event:
    "Flightcheck(address indexed sender, bytes32 indexed challenge, uint256 chainId)",
  verifiedAt: "2026-08-12",
  boundary:
    "This is an external public Base Sepolia canary. It proves one bounded KeeperHub execution. It is not a FillPilot-owned contract, CoW order, token approval, or financial fill.",
} as const;
