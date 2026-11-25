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
  const allowed = ["reviewing","interview","offered","hired","rejected"];
  if (!body.application_id || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "Choose a valid application status." }, { status: 400 });
  const { data: job } = await supabase.from("workforce_jobs").select("id").eq("id", id).eq("owner_user_id", user.id).maybeSingle();
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const { data: application } = await supabase.from("workforce_applications").select("id,applicant_user_id").eq("id", body.application_id).eq("job_id", id).maybeSingle();
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (body.status === "hired") {
    const { data: subscription } = await supabase.from("subscriptions").select("plan_code").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const employeeCaps: Record<string, number> = { free: 1, plus: 3, creator: 3, pro: 10, galaxy: 10, studio_pro: 20, developer: 25, merchant_enterprise: 50, business: 100, enterprise: 500 };
    const cap = employeeCaps[subscription?.plan_code ?? "free"] ?? 1;
    const { count } = await supabase.from("workforce_employees").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).eq("status", "active");
    const { data: existing } = await supabase.from("workforce_employees").select("id").eq("owner_user_id", user.id).eq("employee_user_id", application.applicant_user_id).maybeSingle();
    if (!existing && (count ?? 0) >= cap) return NextResponse.json({ error: `Your current plan supports ${cap} active employee seat(s). Upgrade to hire more.`, upgrade_required: true }, { status: 403 });
    if (!existing) {
      const { error: hireError } = await supabase.from("workforce_employees").insert({ owner_user_id: user.id, employee_user_id: application.applicant_user_id, job_id: id, application_id: application.id });
      if (hireError) return NextResponse.json({ error: "Could not add this employee. Check your plan's employee limit." }, { status: 403 });
    }
  } else {
    await supabase.from("workforce_employees").delete().eq("owner_user_id", user.id).eq("application_id", application.id);
  }
  const { data, error } = await supabase.from("workforce_applications").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", body.application_id).eq("job_id", id).select("id,status").single();
  if (error) return NextResponse.json({ error: "Could not update application." }, { status: 500 });
  return NextResponse.json({ application: data });
}
