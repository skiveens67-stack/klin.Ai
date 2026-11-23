import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NotificationCategory = "account" | "security" | "billing" | "family" | "business" | "marketplace" | "social" | "learning" | "product";

export async function createUserNotification(input: {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  actionUrl?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data: preference } = await admin.from("notification_preferences")
    .select("in_app_enabled,email_enabled").eq("user_id", input.userId).eq("category", input.category).maybeSingle();
  const inAppEnabled = preference?.in_app_enabled ?? true;
  const emailEnabled = preference?.email_enabled ?? false;
  const { data: notification, error } = await admin.from("notifications").insert({
    user_id: input.userId, category: input.category, title: input.title,
    body: input.body, action_url: input.actionUrl ?? null,
  }).select("id").single();
  if (error || !notification) throw new Error("Unable to create notification.");
  if (emailEnabled) {
    const { error: deliveryError } = await admin.from("notification_deliveries").upsert({
      notification_id: notification.id, user_id: input.userId, channel: "email", status: "queued",
    }, { onConflict: "notification_id,channel", ignoreDuplicates: true });
    if (deliveryError) throw new Error("Unable to queue notification email.");
  }
  return { notificationId: notification.id, inAppEnabled, emailQueued: emailEnabled };
}
