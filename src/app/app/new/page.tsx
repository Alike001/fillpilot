import { FoundationSurface } from "@/components/foundation-surface";
import { ConnectionDoctor } from "@/components/connection-doctor/connection-doctor";
import { GoalComposer } from "@/components/goal-composer/goal-composer";

export default function NewGoalPage() {
  return (
    <FoundationSurface
      eyebrow="Goal setup"
      title="Define one fill. Keep every boundary visible."
      body="Before any goal can be set, inspect the connected KeeperHub organization and the Base execution prerequisites."
    >
      <Suspense fallback={null}>
        <ConnectionDoctor />
      </Suspense>
      <GoalComposer />
    </FoundationSurface>
  );
}
import { Suspense } from "react";
