"use client";

import Script from "next/script";
import { useState } from "react";

type PaddleEvent = { name?: string };
type PricePreviewResult = {
  data?: {
    details?: {
      lineItems?: Array<{
        price?: { id?: string };
        formattedTotals?: { subtotal?: string };
      }>;
    };
  };
};
type PaddleApi = {
  PricePreview: (request: { items: Array<{ priceId: string; quantity: number }> }) => Promise<PricePreviewResult>;
  Environment: { set: (environment: "sandbox" | "production") => void };
  Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
  Checkout: {
    open: (options: { transactionId: string; customer?: { email: string }; settings?: { theme: "light" | "dark"; locale: string } }) => void;
  };
};

type PaddleWindow = Window & {
  Paddle?: PaddleApi;
  __klinPaddleInitialized?: boolean;
};

const PACKS: Array<{ code: string; name: string; gems: number; price: string; featured?: boolean }> = [
  { code: "starter", priceId: "pri_01m8d58pxfn1gfkc1nr9drcpsw", name: "Starter", gems: 150, price: "$1.99" },
  { code: "basic", priceId: "pri_01m8d59p5mh8ywtr4gzgdg0z7g", name: "Basic", gems: 450, price: "$4.99" },
  { code: "popular", priceId: "pri_01m8d5b78g5kerj6djnmmgg854", name: "Popular", gems: 1000, price: "$9.99", featured: true },
  { code: "pro", priceId: "pri_01m8d5c7b10z11w3wc19mj0x6c", name: "Pro", gems: 2400, price: "$19.99" },
  { code: "ultimate", priceId: "pri_01m8d5dw7742ngzb5mmt9n549k", name: "Ultimate", gems: 6000, price: "$49.99" },
];

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
  const [localizedPrices, setLocalizedPrices] = useState<Record<string, string>>({});

  const initializePaddle = () => {
    const paddleWindow = window as PaddleWindow;
    if (!clientToken) {
      setError("Paddle Sandbox client token is missing from this preview.");
      return;
    }
    const paddle = paddleWindow.Paddle;
    if (!paddle) {
      setError("Paddle Checkout could not load. Refresh and try again.");
      return;
    }
    if (paddleWindow.__klinPaddleInitialized) {
      setReady(true);
      return;
    }

    try {
      paddle.Environment.set("sandbox");
      paddle.Initialize({
        token: clientToken,
        eventCallback: (event: PaddleEvent) => {
          if (event.name === "checkout.completed") {
            setBusyPack("");
            setNotice("Payment completed. Wait for the verified payment notification, then refresh your wallet.");
          }
          if (event.name === "checkout.closed") setBusyPack("");
          if (event.name === "checkout.error") {
            setBusyPack("");
            setError("Paddle could not open this checkout. Try again.");
          }
        },
      });
      paddleWindow.__klinPaddleInitialized = true;
      void paddle.PricePreview({
        items: PACKS.map((pack) => ({ priceId: pack.priceId, quantity: 1 })),
      }).then((result) => {
        const codesByPriceId = new Map(PACKS.map((pack) => [pack.priceId, pack.code]));
        const nextPrices: Record<string, string> = {};
        for (const item of result.data?.details?.lineItems ?? []) {
          const code = item.price?.id ? codesByPriceId.get(item.price.id) : undefined;
          const formatted = item.formattedTotals?.subtotal;
          if (code && typeof formatted === "string") nextPrices[code] = formatted;
        }
        if (Object.keys(nextPrices).length > 0) setLocalizedPrices(nextPrices);
      }).catch(() => {
        // Keep the configured USD prices if localized preview is unavailable.
      });
      setReady(true);
      setError("");
    } catch {
      setError("Paddle Sandbox could not initialize. Check the client token and approved domain.");
    }
  };

  const buyPack = async (packCode: string) => {
    const paddleWindow = window as PaddleWindow;
    const paddle = paddleWindow.Paddle;
    if (!ready || !paddle || busyPack) return;
    setBusyPack(packCode);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/paddle/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pack_code: packCode }),
        cache: "no-store",
      });
      const data = await response.json() as { transaction_id?: string; error?: string };
      if (!response.ok || !data.transaction_id) {
        throw new Error(data.error || "Unable to start Paddle checkout.");
      }

      paddle.Checkout.open({
        transactionId: data.transaction_id,
        settings: { theme: "dark", locale: "en" },
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
            <p><strong>{pack.gems.toLocaleString()} Gems</strong> · {localizedPrices[pack.code] ?? pack.price}</p>
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
      {notice && <><p className="module-alert module-alert-info" role="status">{notice}</p><button type="button" className="module-submit" onClick={() => window.location.reload()}>Refresh Wallet</button></>}
      <p className="module-empty">Sandbox testing only. No live payments are enabled.</p>
    </section>
  );
}
