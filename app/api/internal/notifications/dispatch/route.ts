import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.KLIN_WORKER_SECRET;
  return Boolean(secret && request.headers.get("authorization") === "Bearer " + secret);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized worker request." }, { status: 401 });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.KLIN_NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Notification delivery is not configured." }, { status: 503 });
  }
  const admin = createSupabaseAdminClient();
  const { data: queued, error: queueError } = await admin.from("notification_deliveries")
    .select("id,notification_id,user_id,attempts").in("status", ["queued", "failed"])
    .lte("available_at", new Date().toISOString()).lt("attempts", 10)
    .order("created_at", { ascending: true }).limit(20);
  if (queueError) return NextResponse.json({ error: "Notification delivery queue is not ready." }, { status: 503 });

  let sent = 0, failed = 0, skipped = 0;
  for (const job of queued ?? []) {
    const { data: claimed, error: claimError } = await admin.from("notification_deliveries")
      .update({ status: "processing", locked_at: new Date().toISOString(), attempts: Number(job.attempts) + 1 })
      .eq("id", job.id).in("status", ["queued", "failed"]).select("id").maybeSingle();
    if (claimError || !claimed) { skipped++; continue; }

    try {
      const [{ data: notification, error: notificationError }, { data: authResult, error: userError }] = await Promise.all([
        admin.from("notifications").select("title,body,action_url").eq("id", job.notification_id).single(),
        admin.auth.admin.getUserById(job.user_id),
      ]);
      const email = authResult?.user?.email;
      if (notificationError || !notification || userError || !email) throw new Error("Notification recipient or content is unavailable.");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: [email], subject: notification.title,
          text: notification.body + (notification.action_url ? "\n\n" + notification.action_url : ""),
        }),
        cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      const result = await response.json().catch(() => null) as { id?: string; message?: string } | null;
      if (!response.ok || !result?.id) throw new Error(result?.message || "Email provider rejected delivery.");
      await admin.from("notification_deliveries").update({
        status: "sent", provider_message_id: result.id, sent_at: new Date().toISOString(), locked_at: null, last_error: null,
      }).eq("id", job.id).eq("status", "processing");
      sent++;
    } catch (error) {
      const attempts = Number(job.attempts) + 1;
      const delaySeconds = Math.min(3600, 60 * (2 ** Math.min(attempts, 6)));
      await admin.from("notification_deliveries").update({
        status: "failed", locked_at: null, last_error: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed.",
        available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      }).eq("id", job.id).eq("status", "processing");
      failed++;
    }
  }
  return NextResponse.json({ processed: sent + failed, sent, failed, skipped });
}
