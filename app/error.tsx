"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the error boundary observable without exposing server details to users.
    console.error("Klin route error", error.digest ?? "unclassified");
  }, [error]);

  return (
    <main className="app-state-page">
      <div className="app-state-mark" />
      <h1>Something went wrong.</h1>
      <p>Klin could not load this part of your workspace.</p>
      <button className="app-state-button" onClick={() => reset()}>Try again</button>
      <Link href="/login">Return to sign in</Link>
    </main>
  );
}
