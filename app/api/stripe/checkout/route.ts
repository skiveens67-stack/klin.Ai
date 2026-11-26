// Compatibility alias for the frontend contract. The canonical handler accepts
// only server-mapped plan_code values; never accept client-supplied Stripe price IDs.
export { POST } from "@/app/api/billing/checkout/route";
