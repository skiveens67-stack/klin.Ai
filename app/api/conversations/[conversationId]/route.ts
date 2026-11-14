import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return NextResponse.json({ error: "Invalid conversation id." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: conversation, error: conversationError } = await supabase.from("conversations")
      .select("id,title,assistant_key,archived_at,created_at,updated_at")
      .eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (conversationError) return NextResponse.json({ error: "Unable to load conversation." }, { status: 500 });
    if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

    const { data: messages, error: messagesError } = await supabase.from("messages")
      .select("id,role,content,status,provider,model,token_count,created_at")
      .eq("conversation_id", conversationId).eq("user_id", user.id)
      .order("created_at", { ascending: true }).limit(500);
    if (messagesError) return NextResponse.json({ error: "Unable to load conversation messages." }, { status: 500 });

    return NextResponse.json({ conversation, messages: messages ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Conversation service unavailable." }, { status: 503 });
  }
}
