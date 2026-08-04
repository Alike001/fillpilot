import { FoundationSurface } from "@/components/foundation-surface";

export default async function GoalDetailPage({
  params,
}: PageProps<"/app/goals/[id]">) {
  const { id } = await params;

  return (
    <FoundationSurface
      eyebrow="Goal atlas"
      title="Goal evidence will live here."
      body="A future verified goal will separate its user intent, CoW order, KeeperHub execution, and economic outcome instead of collapsing them into one success label."
      identifier={id}
    />
  );
}
