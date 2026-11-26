import Link from "next/link";

export const metadata = { title: "Offline | Klin", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-mark">K</div>
      <p className="module-eyebrow">KLIN OFFLINE MODE</p>
      <h1>You are offline.</h1>
      <p>Klin cannot reach its AI services or account data right now. Your locally saved project drafts remain on this device and can sync when you reconnect.</p>
      <p className="offline-warning">For privacy, this offline page does not display private conversations, wallet balances, account records, or payment controls.</p>
      <Link href="/">Try connecting again</Link>
    </main>
  );
}