import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "FillPilot — reliable onchain fills",
  description:
    "A deterministic Base execution agent that protects a deadline-based CoW fill through KeeperHub.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
