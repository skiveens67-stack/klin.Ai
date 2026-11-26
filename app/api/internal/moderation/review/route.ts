import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.KLIN_MODERATOR_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized moderation request." }, { status: 401 });
  }
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return NextResponse.json({ error: "Invalid moderation decision." }, { status: 400 });
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["queue_id", "decision", "reason", "reviewer_reference"].includes(key)) ||
      typeof input.queue_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.queue_id) ||
      (input.decision !== "approved" && input.decision !== "rejected") ||
      (input.reason !== undefined && (typeof input.reason !== "string" || input.reason.length > 1000)) ||
      (input.reviewer_reference !== undefined && (typeof input.reviewer_reference !== "string" || input.reviewer_reference.length > 120))) {
    return NextResponse.json({ error: "Provide a valid queue_id, decision, and optional bounded review details." }, { status: 400 });
  }
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("moderation_review_content", {
      p_queue_id: input.queue_id,
      p_decision: input.decision,
      p_reason: typeof input.reason === "string" ? input.reason : "",
      p_reviewer_reference: typeof input.reviewer_reference === "string" ? input.reviewer_reference : "moderator",
    });
    if (error || !data) return NextResponse.json({ error: "Moderation review procedure is unavailable or the item is no longer pending." }, { status: 409 });
    return NextResponse.json({ review: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Moderation review service unavailable." }, { status: 503 });
  }
}
