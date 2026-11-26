import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { parseBusinessConversationInput } from "@/lib/business-talk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: memberships, error: memberError } = await supabase.from("business_conversation_members")
      .select("conversation_id").eq("user_id", user.id).eq("status", "active").limit(200);
    if (memberError) return NextResponse.json({ error: "Business Talk storage is not ready. Apply the approved schema before enabling this feature." }, { status: 503 });
    const ids = [...new Set((memberships ?? []).map((row) => row.conversation_id))];
    if (!ids.length) return NextResponse.json({ conversations: [] }, { headers: { "Cache-Control": "no-store" } });
    const { data, error } = await supabase.from("business_conversations")
      .select("id,subject,created_by_user_id,last_message_at,created_at,updated_at")
      .in("id", ids).order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
    if (error) return NextResponse.json({ error: "Unable to load Business Talk conversations." }, { status: 503 });
    return NextResponse.json({ conversations: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Business Talk service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 8192);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const input = parseBusinessConversationInput(parsed.value);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (input.value.participantIds.includes(user.id)) return NextResponse.json({ error: "Do not include your own user ID in participant_ids." }, { status: 400 });
    const { data: conversation, error: conversationError } = await supabase.from("business_conversations")
      .insert({ created_by_user_id: user.id, subject: input.value.subject })
      .select("id,subject,created_by_user_id,created_at").single();
    if (conversationError || !conversation) return NextResponse.json({ error: "Business Talk storage is not ready or the conversation could not be created." }, { status: 503 });
    const members = [user.id, ...input.value.participantIds].map((userId) => ({
      conversation_id: conversation.id, user_id: userId, status: "active",
    }));
    const { error: membersError } = await supabase.from("business_conversation_members").insert(members);
    if (membersError) {
      try {
        await createSupabaseAdminClient().from("business_conversations").delete()
          .eq("id", conversation.id).eq("created_by_user_id", user.id);
      } catch {
        // The failed conversation remains inaccessible unless all member rows exist.
      }
      return NextResponse.json({ error: "Unable to add conversation participants. No conversation was kept." }, { status: 503 });
    }
    return NextResponse.json({ conversation, participant_count: members.length }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Business Talk service unavailable." }, { status: 503 });
  }
}
