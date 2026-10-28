"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F8FAFC", color: "#0F172A" }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#475569", marginTop: 8 }}>We&apos;ve been notified. Please try again.</p>
          <button
            onClick={reset}
            style={{ marginTop: 20, padding: "10px 18px", borderRadius: 12, background: "#0066FF", color: "white", border: 0, fontWeight: 500, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
