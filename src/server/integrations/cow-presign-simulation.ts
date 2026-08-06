import { encodeFunctionData } from "viem";

import type { PresignOrder } from "./cow-order";
import { cowPresignAbi } from "./keeperhub-direct-simulator";
import type { SimulationRequest } from "./keeperhub-simulation";

export function buildPresignSimulationRequest(
  goalId: string,
  order: PresignOrder,
): SimulationRequest {
  return {
    goalId,
    orderUid: order.uid,
    to: order.settlement,
    data: encodeFunctionData({
      abi: cowPresignAbi,
      functionName: "setPreSignature",
      args: [order.uid, true],
    }),
  };
}
