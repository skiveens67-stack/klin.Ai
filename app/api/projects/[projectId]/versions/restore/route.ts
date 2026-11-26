import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const { projectId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  const parsed = await readLimitedJson(request, 2048);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return NextResponse.json({ error: "Invalid restore request." }, { status: 400 });
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "version_id") ||
      typeof input.version_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.version_id)) {
    return NextResponse.json({ error: "A valid version_id is required." }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.rpc("restore_project_version", {
      p_project_id: projectId, p_version_id: input.version_id,
    });
    if (error || !data) return NextResponse.json({ error: "Unable to restore version. Only an owned private draft can be restored." }, { status: 409 });
    return NextResponse.json({ restore: data, note: "The current draft was saved as a backup version before restoration." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Project restore service unavailable." }, { status: 503 });
  }
}
