import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("marketplace_listings")
      .select("id,project_id,seller_user_id,listing_type,price_minor,currency,status,starts_at,ends_at,creator_share_bps,platform_share_bps,charity_share_bps,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "Unable to load marketplace listings." }, { status: 500 });
    return NextResponse.json({ listings: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Marketplace service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.project_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.project_id)) return NextResponse.json({ error: "Valid project_id is required." }, { status: 400 });
    if (input.listing_type !== "fixed_price" && input.listing_type !== "auction") return NextResponse.json({ error: "Invalid listing type." }, { status: 400 });
    const price = input.price_minor;
    if (input.listing_type === "fixed_price" && (!Number.isSafeInteger(price) || Number(price) <= 0)) return NextResponse.json({ error: "A positive price in minor currency units is required." }, { status: 400 });
    if (input.listing_type === "auction" && price !== undefined && price !== null) return NextResponse.json({ error: "Auction pricing is established through bids, not a fixed price." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("marketplace_listings")
      .insert({ project_id: input.project_id, seller_user_id: user.id, listing_type: input.listing_type, price_minor: input.listing_type === "fixed_price" ? price : null, status: "draft" })
      .select("id,project_id,listing_type,price_minor,currency,status,creator_share_bps,platform_share_bps,charity_share_bps,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to create draft listing. The project must belong to your account." }, { status: 403 });
    return NextResponse.json({ listing: data, note: "Listings remain drafts until backend moderation and payment compliance checks are complete." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
