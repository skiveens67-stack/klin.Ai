import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const { data: job } = await supabase.from("workforce_jobs").select("id").eq("id", id).eq("owner_user_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const { data, error } = await supabase.from("workforce_applications").select("id,applicant_name,cover_note,status,created_at").eq("job_id", id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load applicants." }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { application_id?: string; status?: string };
  const allowed = ["reviewing","interview","offered","rejected"];
  if (!body.application_id || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
  const { data: job } = await supabase.from("workforce_jobs").select("id").eq("id", id).eq("owner_user_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const { data, error } = await supabase.from("workforce_applications").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.application_id).eq("job_id", id).select("id,status").single();
  if (error) return NextResponse.json({ error: "Could not update application." }, { status: 500 });
  return NextResponse.json({ application: data });
}
