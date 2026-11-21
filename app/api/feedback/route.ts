import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 12 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid feedback request." }, { status: 400 });
  }
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["title", "idea", "category"].includes(key))) {
    return NextResponse.json({ error: "Unexpected feedback field." }, { status: 400 });
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const idea = typeof input.idea === "string" ? input.idea.trim() : "";
  const category = typeof input.category === "string" ? input.category : "feature";
  if (title.length < 3 || title.length > 120 || idea.length < 10 || idea.length > 5000) {
    return NextResponse.json({ error: "Provide a title (3–120 characters) and idea (10–5,000 characters)." }, { status: 400 });
  }
  if (!["feature", "improvement", "bug", "business", "other"].includes(category)) {
    return NextResponse.json({ error: "Choose a supported feedback category." }, { status: 400 });
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in to submit an idea." }, { status: 401 });
    const admin = createSupabaseAdminClient();
    const { data, error: insertError } = await admin.from("klin_feedback_ideas").insert({
      user_id: user.id, sender_email: user.email ?? null, title, idea, category, source: "web",
      status: "new",
    }).select("id,created_at,status").single();
    if (insertError || !data) return NextResponse.json({ error: "Feedback could not be saved. The feedback table migration may still need to be applied." }, { status: 503 });
    return NextResponse.json({ feedback: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Feedback service unavailable." }, { status: 503 });
  }
}
