import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const limits: Record<string, { jobs: number; employees: number; promotedAds: boolean }> = {
  free: { jobs: 1, employees: 1, promotedAds: false },
  plus: { jobs: 2, employees: 3, promotedAds: false },
  creator: { jobs: 2, employees: 3, promotedAds: false },
  pro: { jobs: 5, employees: 10, promotedAds: false },
  galaxy: { jobs: 5, employees: 10, promotedAds: false },
  studio_pro: { jobs: 10, employees: 20, promotedAds: false },
  developer: { jobs: 10, employees: 25, promotedAds: false },
  merchant_enterprise: { jobs: 15, employees: 50, promotedAds: true },
  business: { jobs: 25, employees: 100, promotedAds: true },
  enterprise: { jobs: 100, employees: 500, promotedAds: true },
};

async function getContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, planCode: "free" };
  const { data: subscription } = await supabase.from("subscriptions").select("plan_code").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { supabase, user, planCode: subscription?.plan_code ?? "free" };
}

export async function GET() {
  const { supabase, user } = await getContext();
  if (!user) return NextResponse.json({ error: "Sign in to use Klin Hiring." }, { status: 401 });
  const { data, error } = await supabase.from("workforce_jobs").select("id,owner_user_id,business_name,title,description,location,employment_type,pay_range,status,is_promoted,created_at").or(`status.eq.published,owner_user_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load jobs." }, { status: 500 });
  return NextResponse.json({ jobs: (data ?? []).map((job) => ({ ...job, is_mine: job.owner_user_id === user.id })) });
}

export async function POST(request: Request) {
  const { supabase, user, planCode } = await getContext();
  if (!user) return NextResponse.json({ error: "Sign in to post a job." }, { status: 401 });
  const plan = limits[planCode] ?? limits.free;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const businessName = String(body.business_name ?? "").trim().slice(0, 120);
  const title = String(body.title ?? "").trim().slice(0, 120);
  const description = String(body.description ?? "").trim().slice(0, 8000);
  const location = String(body.location ?? "Remote").trim().slice(0, 120) || "Remote";
  const employmentType = String(body.employment_type ?? "Full-time");
  const payRange = String(body.pay_range ?? "").trim().slice(0, 120) || null;
  const promoted = body.is_promoted === true;
  if (businessName.length < 2 || title.length < 3 || description.length < 20) return NextResponse.json({ error: "Add a business name, job title, and a description of at least 20 characters." }, { status: 400 });
  if (!["Full-time","Part-time","Contract","Temporary","Internship"].includes(employmentType)) return NextResponse.json({ error: "Choose a valid employment type." }, { status: 400 });
  const { count } = await supabase.from("workforce_jobs").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).in("status", ["published","draft","paused"]);
  if ((count ?? 0) >= plan.jobs) return NextResponse.json({ error: `Your ${planCode} plan allows ${plan.jobs} active job listing(s). Upgrade your plan to post more.`, upgrade_required: true }, { status: 403 });
  if (promoted && !plan.promotedAds) return NextResponse.json({ error: "Promoted job ads require the Business, Merchant & Enterprise, or Enterprise plan.", upgrade_required: true }, { status: 403 });
  const { data, error } = await supabase.from("workforce_jobs").insert({ owner_user_id: user.id, business_name: businessName, title, description, location, employment_type: employmentType, pay_range: payRange, is_promoted: promoted }).select().single();
  if (error) return NextResponse.json({ error: "Could not publish this job." }, { status: 500 });
  return NextResponse.json({ job: data, plan: { code: planCode, ...plan } }, { status: 201 });
}
