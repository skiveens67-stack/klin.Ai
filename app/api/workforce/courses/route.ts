import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("workforce_courses").select("id,owner_user_id,title,description,course_url,meeting_url,session_at,published").or(`published.eq.true,owner_user_id.eq.${user.id}`).order("session_at", { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load training." }, { status: 500 });
  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(body.title ?? "").trim().slice(0, 140);
  const description = String(body.description ?? "").trim().slice(0, 3000);
  const courseUrl = String(body.course_url ?? "").trim();
  const meetingUrl = String(body.meeting_url ?? "").trim();
  const sessionAt = body.session_at ? String(body.session_at) : null;
  const validUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:"; } catch { return false; } };
  if (title.length < 3 || !validUrl(courseUrl) || (meetingUrl && !validUrl(meetingUrl))) return NextResponse.json({ error: "Enter a title and valid HTTPS course and meeting links." }, { status: 400 });
  const { data, error } = await supabase.from("workforce_courses").insert({ owner_user_id: user.id, title, description, course_url: courseUrl, meeting_url: meetingUrl || null, session_at: sessionAt, published: true }).select().single();
  if (error) return NextResponse.json({ error: "Could not publish training." }, { status: 500 });
  return NextResponse.json({ course: data }, { status: 201 });
}
