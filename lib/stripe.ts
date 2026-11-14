import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured for Klin.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      timeout: 20000,
    });
  }

  return stripeClient;
}
