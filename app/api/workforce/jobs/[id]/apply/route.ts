import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to apply." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const applicantName = String(body.applicant_name ?? "").trim().slice(0, 100);
  const coverNote = String(body.cover_note ?? "").trim().slice(0, 4000);
  if (applicantName.length < 2) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  const { data: job } = await supabase.from("workforce_jobs").select("id,owner_user_id,status").eq("id", id).maybeSingle();
  if (!job || job.status !== "published") return NextResponse.json({ error: "This job is no longer accepting applications." }, { status: 404 });
  if (job.owner_user_id === user.id) return NextResponse.json({ error: "You cannot apply to your own job." }, { status: 400 });
  const { data, error } = await supabase.from("workforce_applications").insert({ job_id: id, applicant_user_id: user.id, applicant_name: applicantName, cover_note: coverNote }).select("id,status,created_at").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "You already applied for this job." : "Application could not be submitted." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ application: data }, { status: 201 });
}
