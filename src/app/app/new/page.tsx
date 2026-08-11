import { FoundationSurface } from "@/components/foundation-surface";
import { ConnectionDoctor } from "@/components/connection-doctor/connection-doctor";
import { GoalComposer } from "@/components/goal-composer/goal-composer";
import { selectedExecutionNetwork } from "@/server/integrations/execution-network";

export default function NewGoalPage() {
  const profile = selectedExecutionNetwork(parseServerEnv());
  return (
    <FoundationSurface
      eyebrow="Goal setup"
      title="Define one fill. Keep every boundary visible."
      body={`Before any goal can be set, inspect the connected KeeperHub organization and the ${profile.label} execution prerequisites.`}
    >
      <Suspense fallback={null}>
        <ConnectionDoctor />
      </Suspense>
      <GoalComposer
        market={{
          network: profile.label,
          sellSymbol: profile.sellSymbol,
          buySymbol: profile.buySymbol,
          sellDecimals: profile.sellDecimals,
          buyDecimals: profile.buyDecimals,
        }}
      />
    </FoundationSurface>
  );
}
import { Suspense } from "react";
import { parseServerEnv } from "@/env";
