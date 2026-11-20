import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const channels = ["sms","email","whatsapp","discord","slack","phone"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("scheduled_actions")
      .select("id,channel,action_type,status,requires_approval,approved_at,run_at,completed_at,last_error,created_at")
      .eq("user_id", user.id).order("run_at", { ascending: true }).limit(100);
    if (error) return NextResponse.json({ error: "Unable to load scheduled actions." }, { status: 500 });
    return NextResponse.json({ actions: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Scheduled action service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const parsed = await readLimitedJson(request, 8192);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.channel !== "string" || !channels.includes(input.channel)) return NextResponse.json({ error: "Unsupported channel." }, { status: 400 });
    if (typeof input.action_type !== "string" || !["send_message","send_email","send_reply","schedule_meeting","check_in"].includes(input.action_type)) return NextResponse.json({ error: "Unsupported action type." }, { status: 400 });
    const runAt = typeof input.run_at === "string" ? new Date(input.run_at) : new Date();
    if (!Number.isFinite(runAt.getTime()) || runAt.getTime() < Date.now() + 30000 || runAt.getTime() > Date.now() + 30 * 86400000) return NextResponse.json({ error: "Scheduled time must be between 30 seconds and 30 days from now." }, { status: 400 });
    const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload) ? input.payload : {};
    if (JSON.stringify(payload).length > 8000) return NextResponse.json({ error: "Action payload is too large." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("scheduled_actions").insert({
      user_id: user.id, channel: input.channel, action_type: input.action_type, payload,
      status: "pending_approval", requires_approval: true, run_at: runAt.toISOString(), idempotency_key: crypto.randomUUID(),
    }).select("id,channel,action_type,status,requires_approval,run_at,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to create scheduled action." }, { status: 500 });
    return NextResponse.json({ action: data, note: "This action is saved but will not execute until explicitly approved and the provider worker is connected." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
