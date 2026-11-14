import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("checkin_sessions")
      .select("id,cadence_minutes,last_confirmed_at,next_due_at,emergency_contact_id,status,created_at,updated_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Unable to load check-in settings." }, { status: 500 });
    return NextResponse.json({ checkins: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Check-in service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const cadence = Number(input.cadence_minutes);
    if (!Number.isInteger(cadence) || cadence < 15 || cadence > 10080) return NextResponse.json({ error: "Check-in interval must be 15 minutes to 7 days." }, { status: 400 });
    const contactId = input.emergency_contact_id;
    if (contactId !== undefined && contactId !== null && (typeof contactId !== "string" || !/^[0-9a-f-]{36}$/i.test(contactId))) return NextResponse.json({ error: "Invalid emergency contact." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (contactId) {
      const { data: contact } = await supabase.from("trusted_contacts").select("id").eq("id", contactId).eq("user_id", user.id).maybeSingle();
      if (!contact) return NextResponse.json({ error: "Emergency contact not found in your trusted contacts." }, { status: 404 });
    }

    const now = new Date();
    const { data, error } = await supabase.from("checkin_sessions").insert({
      user_id: user.id, cadence_minutes: cadence, next_due_at: new Date(now.getTime() + cadence * 60000).toISOString(),
      emergency_contact_id: contactId ?? null, status: "active",
    }).select("id,cadence_minutes,next_due_at,emergency_contact_id,status,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to create check-in schedule." }, { status: 500 });
    return NextResponse.json({ checkin: data, note: "The schedule is stored. Automated escalation is not active until a monitored worker and emergency-service consent flow are configured." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
