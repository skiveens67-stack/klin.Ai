import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const start = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString();

    const { data, error } = await supabase.from("ai_usage_events")
      .select("provider,model,feature,input_units,output_units,cost_microusd,created_at")
      .eq("user_id", user.id).gte("created_at", start).order("created_at", { ascending: false }).limit(1000);
    if (error) return NextResponse.json({ error: "Unable to load AI usage." }, { status: 500 });

    const events = data ?? [];
    const summary = events.reduce((acc, event) => {
      acc.requests += 1;
      acc.input_units += Number(event.input_units ?? 0);
      acc.output_units += Number(event.output_units ?? 0);
      acc.cost_microusd += Number(event.cost_microusd ?? 0);
      return acc;
    }, { requests: 0, input_units: 0, output_units: 0, cost_microusd: 0 });

    return NextResponse.json({ since: start, summary, events }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Usage service unavailable." }, { status: 503 });
  }
}
