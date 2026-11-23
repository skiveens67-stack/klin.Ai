import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { parseBusinessMessageInput } from "@/lib/business-talk";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return NextResponse.json({ error: "Invalid conversation ID." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: membership, error: membershipError } = await supabase.from("business_conversation_members")
      .select("conversation_id").eq("conversation_id", conversationId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (membershipError) return NextResponse.json({ error: "Business Talk storage is not ready." }, { status: 503 });
    if (!membership) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const { data, error } = await supabase.from("business_messages")
      .select("id,conversation_id,sender_user_id,body,created_at,edited_at")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (error) return NextResponse.json({ error: "Unable to load messages." }, { status: 503 });
    return NextResponse.json({ messages: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Business Talk service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const { conversationId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return NextResponse.json({ error: "Invalid conversation ID." }, { status: 400 });
  const parsed = await readLimitedJson(request, 12 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const input = parseBusinessMessageInput(parsed.value, request.headers.get("Idempotency-Key"));
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: membership, error: membershipError } = await supabase.from("business_conversation_members")
      .select("conversation_id").eq("conversation_id", conversationId).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (membershipError) return NextResponse.json({ error: "Business Talk storage is not ready." }, { status: 503 });
    if (!membership) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const key = "business-message:" + user.id + ":" + input.value.idempotencyKey;
    const lookup = () => supabase.from("business_messages").select("id,conversation_id,sender_user_id,body,created_at")
      .eq("sender_user_id", user.id).eq("idempotency_key", key).maybeSingle();
    const prior = await lookup();
    if (prior.error) return NextResponse.json({ error: "Unable to verify message request." }, { status: 503 });
    if (prior.data) {
      if (prior.data.conversation_id !== conversationId || prior.data.body !== input.value.body) return NextResponse.json({ error: "Idempotency key was already used for another message." }, { status: 409 });
      return NextResponse.json({ message: prior.data, replayed: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    const { data, error } = await supabase.from("business_messages").insert({
      conversation_id: conversationId, sender_user_id: user.id, body: input.value.body, idempotency_key: key,
    }).select("id,conversation_id,sender_user_id,body,created_at").single();
    if (error) {
      const raced = await lookup();
      if (raced.data && raced.data.conversation_id === conversationId && raced.data.body === input.value.body) {
        return NextResponse.json({ message: raced.data, replayed: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ error: "Unable to save message." }, { status: 503 });
    }
    await supabase.from("business_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ message: data, replayed: false }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Business Talk service unavailable." }, { status: 503 });
  }
}
