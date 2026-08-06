import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "./site-header";
import styles from "./foundation-surface.module.css";

type FoundationSurfaceProps = {
  eyebrow: string;
  title: string;
  body: string;
  identifier?: string;
  children?: ReactNode;
};

export function FoundationSurface({
  eyebrow,
  title,
  body,
  identifier,
  children,
}: FoundationSurfaceProps) {
  return (
    <main>
      <SiteHeader />
      <section className={styles.shell}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.body}>{body}</p>
        {identifier ? (
          <p className={styles.identifier}>
            Requested identifier: <code>{identifier}</code>
          </p>
        ) : null}
        <div className={styles.notice} role="status">
          <span aria-hidden="true">○</span>
          <div>
            <strong>Write boundary protected</strong>
            <p>
              Quotes and KeeperHub simulations can be recorded here. A real
              onchain authorization exists only when this goal shows a
              transaction hash.
            </p>
          </div>
        </div>
        {children}
        <Link className={styles.back} href="/">
          ← Return to product overview
        </Link>
      </section>
    </main>
  );
}
