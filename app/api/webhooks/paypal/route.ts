import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readLimitedText } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PayPalEvent = {
  id?: unknown;
  event_type?: unknown;
  resource_type?: unknown;
  resource?: unknown;
  create_time?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getPayPalApiBase(): string {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();
  if (mode === "sandbox") return "https://api-m.sandbox.paypal.com";
  if (mode === "live") return "https://api-m.paypal.com";
  throw new Error("PAYPAL_MODE must be sandbox or live.");
}

async function getPayPalAccessToken(apiBase: string): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal API credentials are not configured.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("PayPal OAuth token request failed.");

  const result: unknown = await response.json();
  const token = asRecord(result).access_token;
  if (typeof token !== "string" || token.length < 20) {
    throw new Error("PayPal did not return a valid access token.");
  }
  return token;
}

async function verifyPayPalWebhook(
  apiBase: string,
  accessToken: string,
  headers: Headers,
  webhookId: string,
  event: PayPalEvent,
): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSignature = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgorithm = headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !transmissionSignature || !certUrl || !authAlgorithm) {
    return false;
  }

  const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgorithm,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSignature,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: event,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error("PayPal webhook signature verification request failed.");
  const verification: unknown = await response.json();
  return asRecord(verification).verification_status === "SUCCESS";
}

export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    return NextResponse.json({ error: "PayPal webhook is not configured." }, { status: 503 });
  }

  const rawBodyResult = await readLimitedText(request, 1024 * 1024);
  if (!rawBodyResult.ok) {
    return NextResponse.json({ error: rawBodyResult.error }, { status: rawBodyResult.status });
  }

  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBodyResult.value) as PayPalEvent;
  } catch {
    return NextResponse.json({ error: "Invalid PayPal webhook JSON." }, { status: 400 });
  }

  if (
    typeof event.id !== "string" || event.id.length < 5 || event.id.length > 200 ||
    typeof event.event_type !== "string" || event.event_type.length < 3 || event.event_type.length > 200
  ) {
    return NextResponse.json({ error: "PayPal webhook event is missing required identifiers." }, { status: 400 });
  }

  try {
    const apiBase = getPayPalApiBase();
    const accessToken = await getPayPalAccessToken(apiBase);
    const valid = await verifyPayPalWebhook(apiBase, accessToken, request.headers, webhookId, event);
    if (!valid) {
      return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const resource = asRecord(event.resource);
    const { error: insertError } = await admin.from("paypal_webhook_events").insert({
      provider_event_id: event.id,
      event_type: event.event_type,
      resource_type: typeof event.resource_type === "string" ? event.resource_type : null,
      resource_id: typeof resource.id === "string" ? resource.id : null,
      processing_status: "received",
      payload: event,
    });

    if (insertError?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (insertError) {
      return NextResponse.json({ error: "Unable to store verified PayPal event." }, { status: 500 });
    }

    // Events are durably received here. Subscription entitlements are not changed
    // until the PayPal checkout flow creates a trusted user/plan/subscription mapping.
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "PayPal webhook processing is temporarily unavailable." }, { status: 503 });
  }
}
