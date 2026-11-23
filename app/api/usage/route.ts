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
      if (event.metadata && typeof event.metadata === "object" && (event.metadata as Record<string, unknown>).cost_status === "reported") {
        acc.cost_microusd += Number(event.cost_microusd ?? 0);
        acc.cost_events += 1;
      }
      return acc;
    }, { requests: 0, input_units: 0, output_units: 0, cost_microusd: 0, cost_events: 0 });

    return NextResponse.json({
      since: start,
      summary: {
        requests: summary.requests,
        input_units: summary.input_units,
        output_units: summary.output_units,
        cost_microusd: summary.cost_events > 0 ? summary.cost_microusd : null,
        cost_reporting: summary.cost_events > 0 ? "partial_or_reported" : "not_reported",
      },
      events,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Usage service unavailable." }, { status: 503 });
  }
}
