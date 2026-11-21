import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("klin_profiles")
      .select("username,account_number,created_at")
      .eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Klin account profile is not available yet. The account identity migration may not be installed." }, { status: 503 });
    if (!data) return NextResponse.json({ error: "Klin account profile has not been created yet." }, { status: 404 });
    return NextResponse.json({ profile: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Klin account profile is temporarily unavailable." }, { status: 503 });
  }
}
