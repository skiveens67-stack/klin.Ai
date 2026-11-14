import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptContactValue } from "@/lib/contact-crypto";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const channels = ["sms","email","whatsapp","discord","slack","phone"];

function validContact(channel: string, value: string): boolean {
  if (channel === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (channel === "sms" || channel === "phone" || channel === "whatsapp") return /^\+[1-9]\d{7,14}$/.test(value);
  return value.length >= 2 && value.length <= 160;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("trusted_contacts")
      .select("id,display_name,channel,priority,is_emergency,verified_at,created_at,updated_at")
      .eq("user_id", user.id).order("priority");
    if (error) return NextResponse.json({ error: "Unable to load trusted contacts." }, { status: 500 });
    return NextResponse.json({ contacts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Trusted contact service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const channel = input.channel;
    const displayName = input.display_name;
    const contactValue = input.contact_value;
    if (typeof channel !== "string" || !channels.includes(channel)) return NextResponse.json({ error: "Unsupported contact channel." }, { status: 400 });
    if (typeof displayName !== "string" || displayName.trim().length < 1 || displayName.trim().length > 80) return NextResponse.json({ error: "Contact name must be 1–80 characters." }, { status: 400 });
    if (typeof contactValue !== "string" || !validContact(channel, contactValue.trim())) return NextResponse.json({ error: "Enter a valid contact destination for the selected channel." }, { status: 400 });

    const encrypted = encryptContactValue(contactValue.trim());
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const priority = Number.isInteger(input.priority) ? Math.max(1, Math.min(1000, Number(input.priority))) : 100;
    const { data, error } = await supabase.from("trusted_contacts").insert({
      user_id: user.id, display_name: displayName.trim(), channel, secret_reference: encrypted,
      priority, is_emergency: input.is_emergency === true,
    }).select("id,display_name,channel,priority,is_emergency,verified_at,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to save trusted contact." }, { status: 500 });
    return NextResponse.json({ contact: data, verified: false }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const missingKey = error instanceof Error && error.message.includes("encryption");
    return NextResponse.json({ error: missingKey ? "Trusted contact encryption is not configured." : "Invalid request." }, { status: missingKey ? 503 : 400 });
  }
}
