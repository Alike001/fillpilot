"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import styles from "./connection-doctor.module.css";

type Check = {
  id: string;
  label: string;
  state: "ready" | "attention" | "unavailable";
  detail: string;
};

export function ConnectionDoctor() {
  const [checks, setChecks] = useState<Check[] | undefined>();
  const searchParams = useSearchParams();
  const connectionFailed = searchParams.get("connection") === "failed";

  useEffect(() => {
    void fetch("/api/doctor", { cache: "no-store" })
      .then(async (response) => response.json() as Promise<{ checks: Check[] }>)
      .then((result) => setChecks(result.checks))
      .catch(() => setChecks([]));
  }, []);

  const connected =
    checks?.find((check) => check.id === "connection")?.state === "ready";
  // A callback may be replayed after a prior authorization has already
  // completed. In that case the returned OAuth state is intentionally stale,
  // but the server-held connection is still the source of truth.
  const showConnectionFailure = connectionFailed && connected === false;

  return (
    <section className={styles.panel} aria-labelledby="connection-doctor-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Connection doctor</p>
          <h2 id="connection-doctor-title">
            Confirm the execution environment first.
          </h2>
        </div>
        <span className={styles.badge}>
          {connected ? "Read-only connected" : "Not connected"}
        </span>
      </div>
      <p className={styles.intro}>
        FillPilot can inspect KeeperHub, Base, and CoW readiness here. This step
        cannot send a transaction.
      </p>
      {showConnectionFailure ? (
        <p className={styles.error} role="alert">
          KeeperHub approved the request, but FillPilot could not complete the
          secure token exchange. Reason:{" "}
          {searchParams.get("reason") ?? "unknown"}.
        </p>
      ) : null}
      <ul className={styles.checks} aria-live="polite">
        {(checks ?? Array.from({ length: 6 })).map((check, index) => (
          <li key={check?.id ?? index} className={styles.check}>
            <span
              className={styles.marker}
              data-state={check?.state ?? "unavailable"}
              aria-hidden="true"
            />
            <div>
              <strong>{check?.label ?? "Checking connection…"}</strong>
              <p>{check?.detail ?? "Reading the current browser session."}</p>
            </div>
          </li>
        ))}
      </ul>
      {!connected ? (
        <a className={styles.action} href="/api/connections/keeperhub/start">
          Connect KeeperHub
        </a>
      ) : null}
    </section>
  );
}
