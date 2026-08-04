import Link from "next/link";

import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="FillPilot home">
        <span className={styles.mark} aria-hidden="true">
          F
        </span>
        <span>FillPilot</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link className={styles.link} href="/app/goals">
          Workspace
        </Link>
      </nav>
    </header>
  );
}
