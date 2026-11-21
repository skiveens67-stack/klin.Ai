import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resendInboxRequest } from "@/lib/resend-client";
import { requireSupportAdmin } from "@/lib/support-email";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ emailId: string }> }) {
  const auth = await requireSupportAdmin();
  if (auth.response) return auth.response;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const text = body && typeof body === "object" && "text" in body && typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 6000) return NextResponse.json({ error: "Reply must contain between 1 and 6000 characters." }, { status: 400 });
  const { emailId } = await context.params;
  const admin = createSupabaseAdminClient();
  const { data: supportCase, error } = await admin.from("support_email_cases")
    .select("id, inbox_id, thread_id, resend_email_id, status").eq("id", emailId).maybeSingle();
  if (error || !supportCase) return NextResponse.json({ error: "Support case not found." }, { status: 404 });
  if (supportCase.status === "sent") return NextResponse.json({ error: "A reply has already been sent for this message." }, { status: 409 });
  let result: { id: string };
  try {
    result = await resendInboxRequest<{ id: string }>(
      "/inboxes/" + enc¶»§q«^