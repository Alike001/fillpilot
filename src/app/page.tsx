import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { VERIFIED_TESTNET_PROOF } from "@/server/proof/verified-testnet-proof";

import styles from "./page.module.css";

const stages = [
  [
    "01",
    "Set the goal",
    "Name the amount, preferred receive, safety floor, and deadline.",
  ],
  [
    "02",
    "Define the watch policy",
    "The planned worker watches the real CoW order instead of inventing its own status.",
  ],
  [
    "03",
    "Bound the adaptation",
    "The deterministic policy allows one replacement at the checkpoint—never more.",
  ],
  [
    "04",
    "Prove the execution",
    "KeeperHub execution evidence stays inspectable while the economic lifecycle remains protected.",
  ],
] as const;

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Base · CoW Protocol · KeeperHub</p>
          <h1>
            Your fill has a deadline. Start with a reliable execution
            foundation.
          </h1>
          <p className={styles.lede}>
            FillPilot turns a USDC→WETH goal into a deterministic execution
            policy: define the floor, deadline, and one permitted adaptation,
            then keep every proof boundary inspectable.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/app/new">
              Open the workspace <span aria-hidden="true">↗</span>
            </Link>
            <a className={styles.textAction} href="#atlas">
              Read the execution path
            </a>
          </div>
        </div>
        <aside className={styles.status} aria-label="Current build status">
          <span className={styles.statusLabel}>Foundation status</span>
          <strong>Verified testnet execution</strong>
          <p>
            One bounded Base Sepolia call completed through KeeperHub and has an
            independently verified receipt. It is not presented as a CoW fill.
            The hosted economic write lifecycle remains disabled while this
            foundation is reviewed.
          </p>
          <Link
            className={styles.signal}
            href={`/proof/${VERIFIED_TESTNET_PROOF.id}`}
          >
            <span aria-hidden="true" />
            Inspect the transaction proof
          </Link>
        </aside>
      </section>

      <section
        className={styles.atlas}
        id="atlas"
        aria-labelledby="atlas-title"
      >
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Execution atlas</p>
          <h2 id="atlas-title">One goal. Four inspectable stages.</h2>
        </div>
        <ol className={styles.stageList}>
          {stages.map(([number, title, body]) => (
            <li key={number}>
              <span className={styles.stageNumber}>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        <strong>FillPilot</strong>
        <span>Agents decide. KeeperHub executes. Evidence proves.</span>
      </footer>
    </main>
  );
}
