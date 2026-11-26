import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const categories = ["account", "security", "billing", "family", "business", "marketplace", "social", "learning", "product"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("notification_preferences")
      .select("category,in_app_enabled,email_enabled,updated_at").eq("user_id", user.id).order("category");
    if (error) return NextResponse.json({ error: "Notification preferences are not ready. Apply the approved schema first." }, { status: 503 });
    return NextResponse.json({ preferences: data ?? [], supported_categories: categories }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Notification preference service unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 8192);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["category", "in_app_enabled", "email_enabled"].includes(key)) ||
      typeof input.category !== "string" || !categories.includes(input.category) ||
      typeof input.in_app_enabled !== "boolean" || typeof input.email_enabled !== "boolean") {
    return NextResponse.json({ error: "Provide a supported category and boolean in_app_enabled/email_enabled values." }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("notification_preferences").upsert({
      user_id: user.id, category: input.category,
      in_app_enabled: input.in_app_enabled, email_enabled: input.email_enabled,
    }, { onConflict: "user_id,category" }).select("category,in_app_enabled,email_enabled,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save notification preferences." }, { status: 503 });
    return NextResponse.json({ preference: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Notification preference service unavailable." }, { status: 503 });
  }
}
