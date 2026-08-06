import { FoundationSurface } from "@/components/foundation-surface";
import { GoalPreflight } from "@/components/goal-preflight/goal-preflight";
import { GoalTimeline } from "@/components/goal-timeline/goal-timeline";

export default async function GoalDetailPage({
  params,
}: PageProps<"/app/goals/[id]">) {
  const { id } = await params;

  return (
    <FoundationSurface
      eyebrow="Goal atlas"
      title="Keep every boundary visible."
      body="This timeline separates your goal, CoW quote evidence, KeeperHub execution evidence, and any eventual economic outcome."
      identifier={id}
    >
      <GoalTimeline goalId={id} />
      <GoalPreflight goalId={id} />
    </FoundationSurface>
  );
}
