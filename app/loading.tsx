export default function Loading() {
  return (
    <main className="app-state-page" aria-busy="true" aria-live="polite">
      <div className="app-state-mark" />
      <p>Loading your Klin workspace…</p>
    </main>
  );
}
