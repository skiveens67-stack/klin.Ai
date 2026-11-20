import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const listingId = new URL(request.url).searchParams.get("listing_id");
    if (listingId && !/^[0-9a-f-]{36}$/i.test(listingId)) {
      return NextResponse.json({ error: "Invalid listing_id." }, { status: 400 });
    }
    let query = supabase.from("marketplace_bids").select("id,listing_id,amount_minor,status,created_at").order("amount_minor", { ascending: false }).limit(100);
    if (listingId) query = query.eq("listing_id", listingId);
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
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (Object.keys(input).some((key) => !["listing_id", "amount_minor"].includes(key))) {
      return NextResponse.json({ error: "Unexpected request field." }, { status: 400 });
    }
    if (typeof input.listing_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.listing_id)) return NextResponse.json({ error: "Valid listing_id is required." }, { status: 400 });
    if (!Number.isSafeInteger(input.amount_minor) || Number(input.amount_minor) <= 0) return NextResponse.json({ error: "Bid amount must be a positive integer in minor currency units." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    // The database index is globally unique, so namespace the client key by
    // authenticated actor and operation. Replays return the original result.
    const scopedIdempotencyKey = `user:${user.id}:bid:${idempotencyKey}`;
    const findPriorBid = () => supabase.from("marketplace_bids")
      .select("id,listing_id,amount_minor,status,created_at")
      .eq("bidder_user_id", user.id)
      .eq("idempotency_key", scopedIdempotencyKey)
      .maybeSingle();

    const prior = await findPriorBid();
    if (prior.error) return NextResponse.json({ error: "Unable to verify bid request status." }, { status: 503 });
    if (prior.data) {
      if (prior.data.listing_id !== input.listing_id || prior.data.amount_minor !== input.amount_minor) {
        return NextResponse.json({ error: "This Idempotency-Key was already used for a different bid." }, { status: 409 });
      }
      return NextResponse.json({ bid: prior.data, replayed: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const { data, error } = await supabase.from("marketplace_bids").insert({
      listing_id: input.listing_id, bidder_user_id: user.id, amount_minor: input.amount_minor,
      idempotency_key: scopedIdempotencyKey,
    }).select("id,listing_id,amount_minor,status,created_at").single();
    if (error) {
      // Resolve concurrent duplicate submissions by reading the winner's row.
      const raced = await findPriorBid();
      if (raced.error) return NextResponse.json({ error: "Unable to verify bid request status." }, { status: 503 });
      if (raced.data) {
        if (raced.data.listing_id !== input.listing_id || raced.data.amount_minor !== input.amount_minor) {
          return NextResponse.json({ error: "This Idempotency-Key was already used for a different bid." }, { status: 409 });
        }
        return NextResponse.json({ bid: raced.data, replayed: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ error: "Bid rejected. Confirm the auction is active and your bid exceeds the current bid." }, { status: 409 });
    }
    return NextResponse.json({ bid: data, replayed: false }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
