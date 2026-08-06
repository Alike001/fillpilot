import { FoundationSurface } from "@/components/foundation-surface";
import { GoalHistory } from "@/components/goal-history/goal-history";

export default function GoalsPage() {
  return (
    <FoundationSurface
      eyebrow="Execution history"
      title="Every boundary, visible."
      body="Saved goals and KeeperHub evidence for this connected organization. Simulation, submission, confirmation, and outcome remain separate states."
    >
      <GoalHistory />
    </FoundationSurface>
  );
}
