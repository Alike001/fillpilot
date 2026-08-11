export type SimulationRequest = {
  readonly goalId: string;
  readonly chainId: number;
  readonly orderUid: `0x${string}`;
  readonly to: `0x${string}`;
  readonly data: `0x${string}`;
};

export type SimulationResult =
  | { readonly status: "simulated"; readonly gasEstimate: bigint }
  | { readonly status: "rejected"; readonly reason: string };

export type StoredSimulationEvidence =
  | {
      readonly status: "simulated";
      readonly gasEstimate: string;
      readonly orderUid: `0x${string}`;
    }
  | {
      readonly status: "rejected";
      readonly reason: string;
      readonly orderUid: `0x${string}`;
    };

export type KeeperHubSimulator = {
  simulate(request: SimulationRequest): Promise<SimulationResult>;
};

export type SimulationRecorder = {
  record(input: {
    goalId: string;
    idempotencyKey: string;
    operation: string;
    chainId: number;
    simulation: StoredSimulationEvidence;
  }): Promise<unknown>;
};

export async function simulateOnly(
  simulator: KeeperHubSimulator,
  request: SimulationRequest,
): Promise<SimulationResult> {
  if (!request.goalId || !/^0x[a-fA-F0-9]{112}$/.test(request.orderUid)) {
    throw new Error("Simulation requires a canonical CoW order UID");
  }
  if (!Number.isSafeInteger(request.chainId) || request.chainId <= 0) {
    throw new Error("Simulation requires an explicit positive chain ID");
  }
  if (request.data === "0x") {
    throw new Error("Simulation requires encoded contract calldata");
  }
  return simulator.simulate(request);
}

export async function simulateAndRecord(
  simulator: KeeperHubSimulator,
  recorder: SimulationRecorder,
  request: SimulationRequest,
): Promise<SimulationResult> {
  const result = await simulateOnly(simulator, request);
  await recorder.record({
    goalId: request.goalId,
    idempotencyKey: `simulation:${request.orderUid}`,
    operation: "presign",
    chainId: request.chainId,
    simulation: toStoredSimulationEvidence(result, request.orderUid),
  });
  return result;
}

function toStoredSimulationEvidence(
  result: SimulationResult,
  orderUid: `0x${string}`,
): StoredSimulationEvidence {
  return result.status === "simulated"
    ? {
        status: result.status,
        gasEstimate: result.gasEstimate.toString(),
        orderUid,
      }
    : { ...result, orderUid };
}
