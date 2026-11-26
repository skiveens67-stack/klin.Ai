import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { parseProjectDraftUpdate } from "@/lib/project-draft-updates";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const { projectId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
    }

    const parsed = await readLimitedJson(request, 12 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const update = parseProjectDraftUpdate(parsed.value);
    if (!update.ok) return NextResponse.json({ error: update.error }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("creator_projects")
      .update(update.value)
      .eq("id", projectId)
      .eq("owner_user_id", user.id)
      .select("id,project_type,title,description,visibility,status,content_reference,metadata,created_at,updated_at,published_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to update project." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json(
      { project: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Project service unavailable." }, { status: 503 });
  }
}
