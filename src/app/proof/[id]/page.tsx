import { FoundationSurface } from "@/components/foundation-surface";

export default async function ProofPage({ params }: PageProps<"/proof/[id]">) {
  const { id } = await params;

  return (
    <FoundationSurface
      eyebrow="Public proof"
      title="Proof appears only after verification."
      body="This public route will render sanitized, append-only evidence from a real lifecycle. Until that exists, it makes no claim of execution."
      identifier={id}
    />
  );
}
