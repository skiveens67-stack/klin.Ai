import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getKlinCourse } from "@/lib/learning-catalog";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ courseKey: string }> }) {
  try {
    const { courseKey } = await context.params;
    const course = getKlinCourse(courseKey);
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: progress, error } = await supabase.from("learning_progress")
      .select("progress_percent,score,completed_at,metadata,updated_at")
      .eq("user_id", user.id).eq("course_key", course.key).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to load course progress." }, { status: 503 });
    return NextResponse.json({ course, progress: progress ?? { progress_percent: 0, score: null, completed_at: null } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Learning course unavailable." }, { status: 503 });
  }
}
