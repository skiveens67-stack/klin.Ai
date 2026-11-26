import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const jobTypes = ["sync_profile", "sync_repositories", "sync_calendar", "sync_messages"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("integration_jobs")
      .select("id,provider,job_type,status,attempts,available_at,completed_at,last_error,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (error) return NextResponse.json({ error: "Unable to load integration jobs." }, { status: 503 });
    return NextResponse.json({ jobs: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Integration job service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length < 8 || key.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(key)) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
  }
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return NextResponse.json({ error: "Invalid job request." }, { status: 400 });
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((field) => !["provider", "job_type"].includes(field)) ||
      typeof input.provider !== "string" || !["github", "google", "microsoft", "discord", "slack"].includes(input.provider) ||
      typeof input.job_type !== "string" || !jobTypes.includes(input.job_type)) {
    return NextResponse.json({ error: "Choose a supported provider and sync job type." }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: connection, error: connectionError } = await supabase.from("connected_integrations")
      .select("id,status").eq("user_id", user.id).eq("provider", input.provider).eq("status", "connected").limit(1).maybeSingle();
    if (connectionError) return NextResponse.json({ error: "Unable to verify provider connection." }, { status: 503 });
    if (!connection) return NextResponse.json({ error: "Connect and verify this provider before requesting a sync." }, { status: 409 });
    const admin = createSupabaseAdminClient();
    const scopedKey = "integration:" + user.id + ":" + key;
    const { data: prior, error: priorError } = await admin.from("integration_jobs")
      .select("id,provider,job_type,status,created_at").eq("idempotency_key", scopedKey).maybeSingle();
    if (priorError) return NextResponse.json({ error: "Unable to verify sync request." }, { status: 503 });
    if (prior) return NextResponse.json({ job: prior, replayed: true }, { status: 200 });
    const { data, error } = await admin.from("integration_jobs").insert({
      user_id: user.id, provider: input.provider, job_type: input.job_type,
      idempotency_key: scopedKey, payload: { integration_id: connection.id }, status: "queued",
    }).select("id,provider,job_type,status,created_at").single();
    if (error || !data) return NextResponse.json({ error: "Unable to queue integration sync." }, { status: 503 });
    return NextResponse.json({
      job: data, replayed: false,
      note: "The request is queued. It will remain queued until the matching provider OAuth and sync worker are configured.",
    }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Integration job service unavailable." }, { status: 503 });
  }
}
