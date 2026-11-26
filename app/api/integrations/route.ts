import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const providers = ["github", "google", "microsoft", "discord", "slack", "resend", "stripe"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("connected_integrations")
      .select("id,provider,external_account_id,display_name,scopes,status,connected_at,last_synced_at,created_at,updated_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Unable to load integration connections." }, { status: 503 });
    return NextResponse.json({
      integrations: data ?? [],
      catalog: providers.map((provider) => ({ provider, connection_available: false, status: "not_configured" })),
      note: "OAuth callbacks and provider token storage are not enabled. Catalog entries do not mean an account is connected.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Integration service unavailable." }, { status: 503 });
  }
}
