"use client";

import { useState } from "react";

type PlanCode =
  | "creator" | "pro" | "plus" | "galaxy" | "studio_pro"
  | "family_fortress" | "developer" | "merchant_enterprise"
  | "ultimate" | "business" | "builder_starter" | "builder_pro"
  | "builder_business";

const PADDLE_PRICE_IDS: Record<PlanCode, string> = {
  creator: "pri_01m8cqrc8ydjy8yem6bj4ec8kb",
  pro: "pri_01m8cqpcqqm5a53kqxfm6h6q0w",
  plus: "pri_01m8cqjrbp6tgem8qd01gkp0ym",
  galaxy: "pri_01m8cqx6kbewf8txv9px6x6j76",
  studio_pro: "pri_01m8cr10q255g3d0jn426qh1ax",
  family_fortress: "pri_01m8cr24r5deywga0c26hzezj8",
  developer: "pri_01m8crag3wq5x3jnv1q00dcnxz",
  merchant_enterprise: "pri_01m8crca0w84w70yj5b0cazs6r",
  ultimate: "pri_01m8crfy7atsqtq3d8s8nr7vwf",
  business: "pri_01m8csc0cev22hhk3c4z82r7hk",
  builder_starter: "pri_01m8cse3pcrh8vbhtkk5b5rezx",
  builder_pro: "pri_01m8csja0y2t7e0wc59wnrsd9j",
  builder_business: "pri_01m8csmnbz07svrgrqw5e071h9",
};

type PaddleApi = {
  Environment: { set: (environment: "sandbox") => void };
  Initialize: (options: { token: string }) => void;
  Checkout: {
    open: (options: {
      items: Array<{ priceId: string; quantity: number }>;
      customData: Record<string, string>;
      settings: { displayMode: "overlay"; theme: "dark"; allowLogout: false };
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleApi;
  }
}

let paddleReady: Promise<PaddleApi> | null = null;

async function getPaddle(token: string): Promise<PaddleApi> {
  if (paddleReady) return paddleReady;

  paddleReady = new Promise<PaddleApi>((resolve, reject) => {
    const initialize = () => {
      if (!window.Paddle) {
        reject(new Error("Paddle.js did not load."));
        return;
      }
      try {
        window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({ token });
        resolve(window.Paddle);
      } catch {
        reject(new Error("Paddle.js could not be initialized."));
      }
    };

    if (window.Paddle) {
      initialize();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-klin-paddle="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", initialize, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Paddle.js could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.dataset.klinPaddle = "true";
    script.onload = initialize;
    script.onerror = () => reject(new Error("Paddle.js could not be loaded."));
    document.head.appendChild(script);
  }).catch((error) => {
    paddleReady = null;
    throw error;
  });

  return paddleReady;
}

export default function PaddleSandboxCheckout({ planCode }: { planCode: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const priceId = Object.hasOwn(PADDLE_PRICE_IDS, planCode)
    ? PADDLE_PRICE_IDS[planCode as PlanCode]
    : null;

  if (!priceId) return null;

  async function openSandboxCheckout() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/paddle/config", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const config = await response.json() as { client_token?: string; user_id?: string; error?: string };
      if (!response.ok || !config.client_token || !config.user_id) {
        throw new Error(config.error || "Paddle Sandbox is not configured.");
      }

      const paddle = await getPaddle(config.client_token);
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { klin_user_id: config.user_id, klin_plan_code: planCode },
        settings: { displayMode: "overlay", theme: "dark", allowLogout: false },
      });
      setMessage("Sandbox checkout opened. Completing this test does not activate a plan yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Paddle Sandbox checkout could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="klin-paddle-sandbox-action">
      <button className="klin-plan-button" type="button" disabled={busy} onClick={() => void openSandboxCheckout()}>
        {busy ? "Opening Paddle…" : "Test with Paddle Sandbox"}
      </button>
      {message && <p role="status" className="klin-plan-footnote">{message}</p>}
    </div>
  );
}
