import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const role = new URL(request.url).searchParams.get("role");
    if (role && role !== "buyer" && role !== "seller") return NextResponse.json({ error: "role must be buyer or seller." }, { status: 400 });
    let query = supabase.from("marketplace_orders")
      .select("id,listing_id,buyer_user_id,seller_user_id,amount_minor,currency,status,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(100);
    if (role === "buyer") query = query.eq("buyer_user_id", user.id);
    else if (role === "seller") query = query.eq("seller_user_id", user.id);
    else query = query.or("buyer_user_id.eq." + user.id + ",seller_user_id.eq." + user.id);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "Marketplace order history is unavailable." }, { status: 503 });
    return NextResponse.json({
      orders: data ?? [],
      note: "Order records are read-only here. Buyer checkout, seller settlement, refunds, and payouts remain disabled until Stripe Connect and the marketplace ledger pass review.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Marketplace order service unavailable." }, { status: 503 });
  }
}
