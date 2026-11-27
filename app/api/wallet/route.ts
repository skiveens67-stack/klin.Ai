import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const [{ data: wallet, error: walletError }, { data: transactions, error: txError }] = await Promise.all([
      supabase.from("wallets").select("balance_gems,purchased_gems,subscription_gems,currency,updated_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("id,delta_gems,balance_after,transaction_type,wallet_bucket,status,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
    ]);
    if (walletError || txError) return NextResponse.json({ error: "Unable to load wallet." }, { status: 500 });

    return NextResponse.json({ wallet: wallet ?? { balance_gems: 0, currency: "GEMS" }, transactions: transactions ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Wallet service unavailable." }, { status: 503 });
  }
}
