import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resendInboxRequest } from "@/lib/resend-client";
import { requireSupportAdmin } from "@/lib/support-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ emailId: string }> }) {
  const auth = await requireSupportAdmin();
  if (auth.response) return auth.response;
  const parsed = await request.json().catch(() => null) as unknown;
  const text = parsed && typeof parsed === "object" && "text" in parsed && typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text || text.length > 6000) return NextResponse.json({ error: "Reply must contain between 1 and 6000 characters." }, { status: 400 });
  const { emailId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(emailId)) return NextResponse.json({ error: "Invalid support case ID." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: supportCase, error } = await admin.from("support_email_cases")
    .select("id,inbox_id,thread_id,resend_email_id,status")
    .eq("id", emailId).maybeSingle();
  if (error || !supportCase) return NextResponse.json({ error: "Support case not found." }, { status: 404 });
  if (supportCase.status === "sent") return NextResponse.json({ error: "A reply has already been sent for this message." }, { status: 409 });
  if (supportCase.status === "needs_human") return NextResponse.json({ error: "This case requires human handling and cannot be sent through the automated draft action." }, { status: 403 });
  try {
    const result = await resendInboxRequest<{ id: string }>(
      "/inboxes/" + encodeURIComponent(supportCase.inbox_id) + "/threads/" + encodeURIComponent(supportCase.thread_id) + "/reply",
      { method: "POST", body: JSON.stringify({ text }) },
    );
    const { error: updateError } = await admin.from("support_email_cases").update({
      status: "sent", final_reply: text, sent_email_id: result.id, sent_by: auth.user.id,
      sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", emailId);
    if (updateError) return NextResponse.json({ error: "Reply was sent, but case status could not be updated. Check the Resend thread before retrying." }, { status: 502 });
    return NextResponse.json({ sent: true, email_id: result.id });
  } catch {
    return NextResponse.json({ error: "Resend could not send the reply. Check the inbox configuration." }, { status: 502 });
  }
}
