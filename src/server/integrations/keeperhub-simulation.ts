export type SimulationRequest = {
  readonly goalId: string;
  readonly orderUid: `0x${string}`;
  readonly to: `0x${string}`;
  readonly data: `0x${string}`;
};

export type SimulationResult =
  | { readonly status: "simulated"; readonly gasEstimate: bigint }
  | { readonly status: "rejected"; readonly reason: string };

export type KeeperHubSimulator = {
  simulate(request: SimulationRequest): Promise<SimulationResult>;
};

export type SimulationRecorder = {
  record(input: {
    goalId: string;
    idempotencyKey: string;
    operation: string;
    simulation: SimulationResult;
  }): Promise<unknown>;
};

export async function simulateOnly(
  simulator: KeeperHubSimulator,
  request: SimulationRequest,
): Promise<SimulationResult> {
  if (!request.goalId || !/^0x[a-fA-F0-9]{112}$/.test(request.orderUid)) {
    throw new Error("Simulation requires a canonical CoW order UID");
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
    simulation: result,
  });
  return result;
}
