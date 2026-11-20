export default function CheckoutReturn({ kind, successful }: { kind: "subscription" | "gems"; successful: boolean }) {
  const item = kind === "gems" ? "Gems purchase" : "subscription";
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
      <a href={kind === "gems" ? "/wallet" : "/"}>{kind === "gems" ? "Return to Wallet" : "Return to Klin"}</a>
    </main>
  );
}
