import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data, error } = await supabase.from("subscriptions")
      .select("id,plan_code,status,current_period_start,current_period_end,cancel_at_period_end,canceled_at,created_at,updated_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Unable to load subscriptions." }, { status: 500 });

    return NextResponse.json({ subscriptions: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Subscription service unavailable." }, { status: 503 });
  }
}
