import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const listingId = new URL(request.url).searchParams.get("listing_id");
    let query = supabase.from("marketplace_bids").select("id,listing_id,bidder_user_id,amount_minor,status,created_at").order("amount_minor", { ascending: false }).limit(100);
    if (listingId && /^[0-9a-f-]{36}$/i.test(listingId)) query = query.eq("listing_id", listingId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Unable to load bids." }, { status: 500 });
    return NextResponse.json({ bids: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Auction service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.listing_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.listing_id)) return NextResponse.json({ error: "Valid listing_id is required." }, { status: 400 });
    if (!Number.isSafeInteger(input.amount_minor) || Number(input.amount_minor) <= 0) return NextResponse.json({ error: "Bid amount must be a positive integer in minor currency units." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("marketplace_bids").insert({
      listing_id: input.listing_id, bidder_user_id: user.id, amount_minor: input.amount_minor, idempotency_key: idempotencyKey,
    }).select("id,listing_id,amount_minor,status,created_at").single();
    if (error) return NextResponse.json({ error: "Bid rejected. Confirm the auction is active and your bid exceeds the current bid." }, { status: 409 });
    return NextResponse.json({ bid: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
