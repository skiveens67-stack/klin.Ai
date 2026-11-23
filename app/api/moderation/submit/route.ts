import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";
const contentTypes = ["project", "social_post", "marketplace_listing"];

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return NextResponse.json({ error: "Invalid moderation submission." }, { status: 400 });
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["content_type", "content_id"].includes(key)) ||
      typeof input.content_type !== "string" || !contentTypes.includes(input.content_type) ||
      typeof input.content_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.content_id)) {
    return NextResponse.json({ error: "Provide a supported content_type and valid content_id." }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const table = input.content_type === "project" ? "creator_projects"
      : input.content_type === "social_post" ? "social_posts" : "marketplace_listings";
    const ownerColumn = input.content_type === "project" ? "owner_user_id"
      : input.content_type === "social_post" ? "user_id" : "seller_user_id";
    const { data: draft, error: draftError } = await supabase.from(table).select("id")
      .eq("id", input.content_id).eq(ownerColumn, user.id).eq("status", "draft").maybeSingle();
    if (draftError) return NextResponse.json({ error: "Moderation storage is not ready." }, { status: 503 });
    if (!draft) return NextResponse.json({ error: "Owned draft not found or already submitted." }, { status: 404 });
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("content_moderation_queue").upsert({
      owner_user_id: user.id, content_type: input.content_type, content_id: input.content_id,
      status: "pending", submitted_at: new Date().toISOString(),
    }, { onConflict: "content_type,content_id", ignoreDuplicates: true })
      .select("id,content_type,content_id,status,submitted_at").maybeSingle();
    if (error) return NextResponse.json({ error: "Moderation queue is not ready. Reconcile and approve the pending schema first." }, { status: 503 });
    return NextResponse.json({ submission: data, status: "pending", note: "Submission is queued for review. It is not public or purchasable while pending." }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Moderation service unavailable." }, { status: 503 });
  }
}
