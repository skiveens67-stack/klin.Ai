import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: project } = await supabase.from("creator_projects").select("id")
      .eq("id", projectId).eq("owner_user_id", user.id).maybeSingle();
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const { data, error } = await supabase.from("project_versions")
      .select("id,version_number,label,created_at").eq("project_id", projectId)
      .eq("owner_user_id", user.id).order("version_number", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "Version history is not ready. Approve the pending project-version schema first." }, { status: 503 });
    return NextResponse.json({ versions: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Project version service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const { projectId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  const parsed = await readLimitedJson(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid version request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "label") ||
      (input.label !== undefined && (typeof input.label !== "string" || input.label.trim().length < 1 || input.label.trim().length > 120))) {
    return NextResponse.json({ error: "Version label must be 1–120 characters." }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.rpc("create_project_version", {
      p_project_id: projectId, p_label: typeof input.label === "string" ? input.label.trim() : "Checkpoint",
    });
    if (error || !data) return NextResponse.json({ error: "Unable to create version. Confirm the project is yours, is a private draft, and the approved schema is installed." }, { status: 503 });
    return NextResponse.json({ version: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Project version service unavailable." }, { status: 503 });
  }
}
