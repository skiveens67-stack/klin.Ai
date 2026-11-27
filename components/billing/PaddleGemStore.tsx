"use client";

import Script from "next/script";
import { useState } from "react";

type PaddleEvent = { name?: string };
type PaddleApi = {
  Environment: { set: (environment: "sandbox" | "production") => void };
  Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
  Checkout: {
    open: (options: { transactionId: string; customer?: { email: string } }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleApi;
    __klinPaddleInitialized?: boolean;
  }
}

const PACKS = [
  { code: "starter", name: "Starter", gems: 150, price: "$1.99" },
  { code: "basic", name: "Basic", gems: 450, price: "$4.99" },
  { code: "popular", name: "Popular", gems: 1000, price: "$9.99", featured: true },
  { code: "pro", name: "Pro", gems: 2400, price: "$19.99" },
  { code: "ultimate", name: "Ultimate", gems: 6000, price: "$49.99" },
] as const;

export default function PaddleGemStore({
  clientToken,
  userEmail,
}: {
  clientToken: string;
  userEmail: string;
}) {
  const [ready, setReady] = useState(false);
  const [busyPack, setBusyPack] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const initializePaddle = () => {
    if (!clientToken) {
      setError("Paddle Sandbox client token is missing from this preview.");
      return;
    }
    if (!window.Paddle) {
      setError("Paddle Checkout could not load. Refresh and try again.");
      return;
    }
    if (window.__klinPaddleInitialized) {
      setReady(true);
      return;
    }

    try {
      window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (event) => {
          if (event.name === "checkout.completed") {
            setNotice("Payment completed. Purchased Gems will appear after the verified payment notification is processed.");
          }
        },
      });
      window.__klinPaddleInitialized = true;
      setReady(true);
      setError("");
    } catch {
      setError("Paddle Sandbox could not initialize. Check the client token and approved domain.");
    }
  };

  const buyPack = async (packCode: string) => {
    if (!ready || !window.Paddle || busyPack) return;
    setBusyPack(packCode);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/paddle/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ pack_code: packCode }),
        cache: "no-store",
      });
      const data = await response.json() as { transaction_id?: string; error?: string };
      if (!response.ok || !data.transaction_id) {
        throw new Error(data.error || "Unable to start Paddle checkout.");
      }

      window.Paddle.Checkout.open({
        transactionId: data.transaction_id,
        ...(userEmail ? { customer: { email: userEmail } } : {}),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start Paddle checkout.");
      setBusyPack("");
    }
  };

  return (
    <section className="module-card paddle-gem-store">
      {clientToken && (
        <Script
          src="https://cdn.paddle.com/paddle/v2/paddle.js"
          strategy="afterInteractive"
          onReady={initializePaddle}
          onError={() => setError("Paddle Checkout could not load.")}
        />
      )}
      <div className="module-card-title">
        <h2>Buy Purchased Gems</h2>
        <span className="module-count">Sandbox</span>
      </div>
      <p className="module-empty">Purchased Gems can be used for Klin AI features and eligible Klin Store purchases. Subscription Gems are kept separate.</p>
      <div className="module-record-list">
        {PACKS.map((pack) => (
          <article className="module-record paddle-gem-pack" key={pack.code}>
            <div className="module-record-title">
              {pack.name}{pack.featured ? " · Popular" : ""}
            </div>
            <p><strong>{pack.gems.toLocaleString()} Gems</strong> · {pack.price}</p>
            <button
              type="button"
              className="module-submit"
              onClick={() => void buyPack(pack.code)}
              disabled={!ready || Boolean(busyPack)}
            >
              {busyPack === pack.code ? "Opening checkout…" : ready ? `Buy ${pack.name}` : "Loading Sandbox checkout…"}
            </button>
          </article>
        ))}
      </div>
      {!clientToken && <p className="module-alert module-alert-error">Paddle Sandbox client token is not configured for this preview.</p>}
      {error && <p className="module-alert module-alert-error" role="alert">{error}</p>}
      {notice && <p className="module-alert module-alert-info" role="status">{notice}</p>}
      <p className="module-empty">Sandbox testing only. No live payments are enabled.</p>
    </section>
  );
}
