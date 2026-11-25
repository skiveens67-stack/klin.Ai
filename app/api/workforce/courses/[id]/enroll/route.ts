import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to enroll." }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await supabase.from("workforce_enrollments").insert({ course_id: id, user_id: user.id }).select("id,created_at").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "You are already enrolled." : "Could not enroll." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ enrollment: data }, { status: 201 });
}
