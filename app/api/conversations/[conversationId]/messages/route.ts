import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const { conversationId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return NextResponse.json({ error: "Invalid conversation id." }, { status: 400 });
    const parsed = await readLimitedJson(request, 80 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const content = (body as Record<string, unknown>).content;
    if (typeof content !== "string" || content.trim().length < 1 || content.length > 20000) {
      return NextResponse.json({ error: "Message must be 1–20,000 characters." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: conversation } = await supabase.from("conversations")
      .select("id,title").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const { data: message, error } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: content.trim(), status: "complete" })
      .select("id,conversation_id,role,content,status,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to save message." }, { status: 500 });

    const firstMessageTitle = content.trim().replace(/\s+/g, " ").slice(0, 80);
    const conversationUpdates: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (conversation.title === "New conversation") {
      conversationUpdates.title = firstMessageTitle;
    }
    await supabase.from("conversations")
      .update(conversationUpdates)
      .eq("id", conversationId)
      .eq("user_id", user.id);
    return NextResponse.json({
      message,
      assistant: { status: "not_connected", detail: "Conversation storage is ready. The Klinie model provider and streaming worker still need credentials and provider selection." },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request or conversation service unavailable." }, { status: 400 });
  }
}
