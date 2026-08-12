import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { VERIFIED_TESTNET_PROOF } from "@/server/proof/verified-testnet-proof";

import styles from "../proof.module.css";

export default async function ProofPage({ params }: PageProps<"/proof/[id]">) {
  const { id } = await params;
  if (id !== VERIFIED_TESTNET_PROOF.id) notFound();

  const proof = VERIFIED_TESTNET_PROOF;
  return (
    <main>
      <SiteHeader />
      <section className={styles.shell}>
        <p className={styles.eyebrow}>Public execution proof</p>
        <h1>One KeeperHub testnet call, verified onchain.</h1>
        <p className={styles.lede}>
          FillPilot records the execution request, KeeperHub completion, and
          Base Sepolia receipt as separate facts.
        </p>

        <section className={styles.status} aria-label="Execution status">
          <span>Receipt status</span>
          <strong>{proof.receiptStatus}</strong>
          <p>
            {proof.network} · Chain ID {proof.chainId} · {proof.value}
          </p>
        </section>

        <dl className={styles.facts}>
          <div>
            <dt>KeeperHub execution</dt>
            <dd>{proof.executionId}</dd>
          </div>
          <div>
            <dt>Transaction</dt>
            <dd>
              <a href={proof.transactionLink} target="_blank" rel="noreferrer">
                {proof.transactionHash} ↗
              </a>
            </dd>
          </div>
          <div>
            <dt>Verified contract</dt>
            <dd>{proof.canaryContract}</dd>
          </div>
          <div>
            <dt>Function</dt>
            <dd>{proof.function}</dd>
          </div>
          <div>
            <dt>Organization wallet</dt>
            <dd>{proof.organizationWallet}</dd>
          </div>
          <div>
            <dt>Gas used</dt>
            <dd>{proof.gasUsed}</dd>
          </div>
        </dl>

        <section className={styles.event}>
          <p>Receipt assertion</p>
          <strong>{proof.event}</strong>
          <span>
            The receipt indexed the connected organization wallet and the exact
            reviewed challenge.
          </span>
        </section>

        <p className={styles.boundary}>{proof.boundary}</p>
        <Link className={styles.back} href="/">
          ← Return to product overview
        </Link>
      </section>
    </main>
  );
}
