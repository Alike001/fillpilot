import { FoundationSurface } from "@/components/foundation-surface";

export default function GoalsPage() {
  return (
    <FoundationSurface
      eyebrow="Workspace"
      title="No goals yet—and no invented activity."
      body="Real goals will appear here only after they are stored in PostgreSQL and reconciled against KeeperHub, CoW Protocol, and Base."
    />
  );
}
