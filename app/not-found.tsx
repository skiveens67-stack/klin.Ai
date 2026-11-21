import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-state-page">
      <div className="app-state-code">404</div>
      <h1>Page not found.</h1>
      <p>The page may have moved or is not part of this Klin workspace.</p>
      <Link className="app-state-button" href="/">Go to Klin</Link>
    </main>
  );
}
