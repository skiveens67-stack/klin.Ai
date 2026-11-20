"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="app-state-page">
          <h1>Klin could not start.</h1>
          <p>Reload the workspace or return to sign in.</p>
          <button className="app-state-button" onClick={() => reset()}>Try again</button>
          <a href="/login">Sign in</a>
        </main>
      </body>
    </html>
  );
}
