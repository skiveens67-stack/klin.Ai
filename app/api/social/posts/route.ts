import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("social_posts")
      .select("id,user_id,project_id,body,visibility,status,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(50);
    if (error) return NextResponse.json({ error: "Unable to load social posts." }, { status: 500 });
    return NextResponse.json({ posts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Social service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const text = input.body;
    if (typeof text !== "string" || text.trim().length < 1 || text.length > 4000) return NextResponse.json({ error: "Post text must be 1–4,000 characters." }, { status: 400 });
    if (input.visibility !== undefined && !["public","followers","private"].includes(String(input.visibility))) return NextResponse.json({ error: "Invalid post visibility." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("social_posts")
      .insert({ user_id: user.id, body: text.trim(), visibility: input.visibility ?? "public", status: "draft" })
      .select("id,body,visibility,status,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to save social post." }, { status: 500 });
    return NextResponse.json({ post: data, note: "Post saved as a draft until moderation is available." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
