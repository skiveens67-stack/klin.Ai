import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KLIN_LEARNING_COURSES } from "@/lib/learning-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: progress, error } = await supabase.from("learning_progress")
      .select("course_key,progress_percent,score,completed_at,updated_at")
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Unable to load learning progress." }, { status: 503 });
    const byCourse = new Map((progress ?? []).map((item) => [item.course_key, item]));
    return NextResponse.json({
      courses: KLIN_LEARNING_COURSES.map((course) => ({
        ...course,
        progress: byCourse.get(course.key) ?? { progress_percent: 0, score: null, completed_at: null },
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Learning catalog unavailable." }, { status: 503 });
  }
}
