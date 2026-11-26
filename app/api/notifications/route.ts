import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const [{ data, error }, { data: preferences, error: preferenceError }] = await Promise.all([
      supabase.from("notifications").select("id,category,title,body,action_url,read_at,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("notification_preferences").select("category,in_app_enabled").eq("user_id", user.id),
    ]);
    if (error) return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
    // Keep the existing inbox usable if the optional preferences schema has not
    // been reconciled yet; once available, disabled categories are hidden.
    const disabled = preferenceError ? new Set<string>() : new Set((preferences ?? []).filter((p) => !p.in_app_enabled).map((p) => p.category));
    return NextResponse.json({ notifications: (data ?? []).filter((item) => !disabled.has(item.category)).slice(0, 50) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Notification service unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const { id, mark_all } = body as Record<string, unknown>;
    if (mark_all !== true && (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) return NextResponse.json({ error: "Provide a valid notification id or mark_all: true." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id);
    if (mark_all !== true) query = query.eq("id", id as string);
    const { error } = await query;
    if (error) return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
