import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireSupportAdmin } from "@/lib/support-email";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await requireSupportAdmin();
  if (auth.response) return auth.response;
  const status = new URL(request.url).searchParams.get("status");
  const admin = createSupabaseAdminClient();
  let query = admin.from("support_email_cases")
    .select("id, sender, sender_address, subject, body_text, category, priority, summary, ai_draft, status, requires_human, escalation_reason, received_at, processed_at, sent_at")
    .order("received_at", { ascending: false }).limit(100);
  if (status && ["processing", "awaiting_review", "needs_human", "sent", "failed"].includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load support cases." }, { status: 500 });
  return NextResponse.json({ cases: data || [] });
}
