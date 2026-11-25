import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: subscription, error } = await supabase.from("subscriptions")
      .select("plan_code,status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("is_promoted", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Plan information is unavailable." }, { status: 503 });
    return NextResponse.json({ planCode: subscription?.plan_code ?? "free" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Dashboard summary unavailable." }, { status: 503 });
  }
}
