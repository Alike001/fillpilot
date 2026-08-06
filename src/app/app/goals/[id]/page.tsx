import { FoundationSurface } from "@/components/foundation-surface";
import { GoalPreflight } from "@/components/goal-preflight/goal-preflight";

export default async function GoalDetailPage({
  params,
}: PageProps<"/app/goals/[id]">) {
  const { id } = await params;

  return (
    <FoundationSurface
      eyebrow="Goal atlas"
      title="Read the market before you commit."
      body="A fresh verified CoW quote is evidence, not an order. FillPilot keeps that boundary explicit."
      identifier={id}
    >
      <GoalPreflight goalId={id} />
    </FoundationSurface>
  );
}
