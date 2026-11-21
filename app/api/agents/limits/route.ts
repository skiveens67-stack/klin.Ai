import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateAgentCapacity } from "@/lib/agent-capacity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("plan_code,status")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (error) {
      return NextResponse.json(
        { error: "Unable to verify your paid agent entitlements." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const capacity = calculateAgentCapacity(subscriptions ?? []);
    return NextResponse.json({
      ...capacity,
      note: "The builder plan, agent capacity and maximum Klin module level are read from verified active subscription records. The module API enforces the model-level ceiling per request; parallel worker admission and concurrency enforcement are not connected.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Agent capacity service unavailable." }, { status: 503 });
  }
}
