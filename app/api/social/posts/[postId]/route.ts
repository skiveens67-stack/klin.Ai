import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { parseSocialDraftUpdate } from "@/lib/social-draft-updates";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ postId: string }> }) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const { postId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(postId)) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }
    const parsed = await readLimitedJson(request, 8 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const update = parseSocialDraftUpdate(parsed.value);
    if (!update.ok) return NextResponse.json({ error: update.error }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("social_posts")
      .update(update.value)
      .eq("id", postId)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .select("id,user_id,project_id,body,visibility,status,created_at,updated_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Unable to update social draft." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Draft post not found." }, { status: 404 });

    return NextResponse.json({ post: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Social service unavailable." }, { status: 503 });
  }
}
