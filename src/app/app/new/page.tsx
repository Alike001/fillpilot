import { FoundationSurface } from "@/components/foundation-surface";
import { ConnectionDoctor } from "@/components/connection-doctor/connection-doctor";

export default function NewGoalPage() {
  return (
    <FoundationSurface
      eyebrow="Goal setup"
      title="Define one fill. Keep every boundary visible."
      body="Before any goal can be set, inspect the connected KeeperHub organization and the Base execution prerequisites."
    >
      <ConnectionDoctor />
    </FoundationSurface>
  );
}
