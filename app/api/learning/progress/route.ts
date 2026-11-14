import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("learning_progress")
      .select("id,course_key,progress_percent,score,completed_at,metadata,updated_at")
      .eq("user_id", user.id).order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Unable to load learning progress." }, { status: 500 });
    return NextResponse.json({ progress: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Learning service unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.course_key !== "string" || !/^[a-z0-9._-]{1,100}$/i.test(input.course_key)) return NextResponse.json({ error: "Invalid course key." }, { status: 400 });
    const progress = Number(input.progress_percent);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return NextResponse.json({ error: "Progress must be between 0 and 100." }, { status: 400 });
    const score = input.score === undefined || input.score === null ? null : Number(input.score);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) return NextResponse.json({ error: "Score must be between 0 and 100." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("learning_progress").upsert({
      user_id: user.id, course_key: input.course_key, progress_percent: progress, score,
      completed_at: progress === 100 ? new Date().toISOString() : null,
    }, { onConflict: "user_id,course_key" }).select("id,course_key,progress_percent,score,completed_at,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to save learning progress." }, { status: 500 });
    return NextResponse.json({ progress: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
