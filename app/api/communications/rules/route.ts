import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const channels = ["sms","email","whatsapp","discord","slack","phone"];
const tiers = ["ask_first","trusted_circle_auto","full_proxy"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("communication_rules")
      .select("id,channel,permission_tier,enabled,rule_config,created_at,updated_at")
      .eq("user_id", user.id).order("channel");
    if (error) return NextResponse.json({ error: "Unable to load communication permissions." }, { status: 500 });
    return NextResponse.json({ rules: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Communication settings unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.channel !== "string" || !channels.includes(input.channel)) return NextResponse.json({ error: "Unsupported communication channel." }, { status: 400 });
    if (typeof input.permission_tier !== "string" || !tiers.includes(input.permission_tier)) return NextResponse.json({ error: "Invalid permission tier." }, { status: 400 });
    if (typeof input.enabled !== "boolean") return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
    const enabled = input.enabled;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("communication_rules").upsert({
      user_id: user.id, channel: input.channel, permission_tier: input.permission_tier,
      enabled, rule_config: {},
    }, { onConflict: "user_id,channel" }).select("id,channel,permission_tier,enabled,rule_config,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save communication permissions." }, { status: 500 });
    return NextResponse.json({ rule: data, note: "Permission settings are stored. External messaging actions remain disabled until the relevant provider is connected and consent checks are implemented." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
