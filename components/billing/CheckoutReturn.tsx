import Link from "next/link";

export default function CheckoutReturn({ kind, successful }: { kind: "subscription" | "gems" | "builder_deposit"; successful: boolean }) {
  const item = kind === "gems" ? "Gems purchase" : kind === "builder_deposit" ? "build deposit" : "subscription";
  return (
    <main className="checkout-return-page">
      <div className="checkout-return-mark">{successful ? "✓" : "↩"}</div>
      <div className="module-eyebrow">KLIN BILLING</div>
      <h1>{successful ? "Checkout returned." : "Checkout cancelled."}</h1>
      <p>{successful
        ? `Your ${item} checkout has returned to Klin. Your account will update only after Stripe verifies the payment event on the server.`
        : `You left the ${item} checkout before completing payment. No ${item} credit or subscription has been applied.`}</p>
      <p className="checkout-return-note">{successful
        ? "If the balance or subscription does not appear shortly, refresh your Wallet. Never rely on this page alone as proof of payment."
        : "You can return to your Wallet whenever you are ready."}</p>
      <Link href={kind === "gems" ? "/wallet" : kind === "builder_deposit" ? "/builder" : "/"}>{kind === "gems" ? "Return to Wallet" : kind === "builder_deposit" ? "Return to Builder" : "Return to Klin"}</Link>
    </main>
  );
}
