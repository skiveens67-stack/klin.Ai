import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: events, error } = await supabase
      .from("referral_events")
      .select("id, status, created_at")
      .eq("referrer_profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: "Unable to load referral activity." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const referrals = events ?? [];
    const summary = {
      returned: referrals.length,
      registered: referrals.filter((event) => event.status === "registered").length,
      qualified: referrals.filter((event) => event.status === "qualified").length,
      rewarded: referrals.filter((event) => event.status === "rewarded").length,
    };

    return NextResponse.json(
      { summary, referrals },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Referral service is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
