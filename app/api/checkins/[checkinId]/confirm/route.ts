import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ checkinId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const { checkinId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(checkinId)) return NextResponse.json({ error: "Invalid check-in id." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: session, error } = await supabase.from("checkin_sessions").select("id,cadence_minutes,status")
      .eq("id", checkinId).eq("user_id", user.id).maybeSingle();
    if (error || !session) return NextResponse.json({ error: "Check-in schedule not found." }, { status: 404 });
    if (session.status !== "active") return NextResponse.json({ error: "Check-in schedule is not active." }, { status: 409 });

    const now = new Date();
    const { data, error: updateError } = await supabase.from("checkin_sessions").update({
      last_confirmed_at: now.toISOString(), next_due_at: new Date(now.getTime() + session.cadence_minutes * 60000).toISOString(),
    }).eq("id", checkinId).eq("user_id", user.id)
      .select("id,last_confirmed_at,next_due_at,status").single();
    if (updateError) return NextResponse.json({ error: "Unable to confirm check-in." }, { status: 500 });
    return NextResponse.json({ checkin: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Check-in service unavailable." }, { status: 503 });
  }
}
