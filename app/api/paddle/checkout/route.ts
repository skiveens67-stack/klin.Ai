import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const GEM_PACKS: Record<string, { priceId: string; gems: number }> = {
  starter: { priceId: "pri_01m8d58pxfn1gfkc1nr9drcpsw", gems: 150 },
  basic: { priceId: "pri_01m8d59p5mh8ywtr4gzgdg0z7g", gems: 450 },
  popular: { priceId: "pri_01m8d5b78g5kerj6djnmmgg854", gems: 1000 },
  pro: { priceId: "pri_01m8d5c7b10z11w3wc19mj0x6c", gems: 2400 },
  ultimate: { priceId: "pri_01m8d5dw7742ngzb5mmt9n549k", gems: 6000 },
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    return NextResponse.json({ error: "Paddle Sandbox is not configured on this deployment." }, { status: 503 });
  }

  const parsed = await readLimitedJson(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const input = asRecord(parsed.value);
  if (Object.keys(input).some((key) => key !== "pack_code")) {
    return NextResponse.json({ error: "Unexpected request field." }, { status: 400 });
  }

  const packCode = typeof input.pack_code === "string" ? input.pack_code : "";
  const pack = GEM_PACKS[packCode];
  if (!pack) return NextResponse.json({ error: "Choose a supported Gem pack." }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!user.email || !user.email_confirmed_at) {
      return NextResponse.json({ error: "Verify your email address before purchasing Gems." }, { status: 403 });
    }

    // Sign the account and pack metadata so a browser cannot change the recipient
    // or upgrade a lower-priced item by editing checkout custom_data.
    const signature = createHmac("sha256", webhookSecret)
      .update(`${user.id}:${packCode}`)
      .digest("hex");

    const paddleResponse = await fetch("https://sandbox-api.paddle.com/transactions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: pack.priceId, quantity: 1 }],
        custom_data: {
          klin_user_id: user.id,
          klin_pack_code: packCode,
          klin_wallet_bucket: "purchased",
          klin_signature: signature,
        },
      }),
      cache: "no-store",
    });

    const paddlePayload: unknown = await paddleResponse.json().catch(() => null);
    if (!paddleResponse.ok) {
      return NextResponse.json({ error: "Paddle could not create the Sandbox checkout. Check the Sandbox catalog and API key." }, { status: 502 });
    }

    const transaction = asRecord(asRecord(paddlePayload).data);
    const transactionId = typeof transaction.id === "string" ? transaction.id : null;
    if (!transactionId || !/^txn_[a-z0-9]{26}$/i.test(transactionId)) {
      return NextResponse.json({ error: "Paddle returned an invalid checkout transaction." }, { status: 502 });
    }

    return NextResponse.json({
      transaction_id: transactionId,
      pack_code: packCode,
      gems: pack.gems,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to create a secure Paddle Sandbox checkout." }, { status: 502 });
  }
}
