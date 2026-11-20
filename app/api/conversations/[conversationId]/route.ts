import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const MAX_UPDATE_BODY_BYTES = 4 * 1024;

type RouteContext = { params: Promise<{ conversationId: string }> };

function isConversationId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { conversationId } = await context.params;
    if (!isConversationId(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation id." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id,title,assistant_key,archived_at,created_at,updated_at")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) {
      return NextResponse.json({ error: "Unable to load conversation." }, { status: 500 });
    }
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id,role,content,status,provider,model,token_count,created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) {
      return NextResponse.json({ error: "Unable to load conversation messages." }, { status: 500 });
    }

    return NextResponse.json(
      { conversation, messages: messages ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Conversation service unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const { conversationId } = await context.params;
    if (!isConversationId(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation id." }, { status: 400 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_UPDATE_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    const body: unknown = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const allowedKeys = new Set(["title", "archived"]);
    if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
      return NextResponse.json({ error: "Unsupported conversation field." }, { status: 400 });
    }

    const updates: { title?: string; archived_at?: string | null; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if ("title" in input) {
      if (typeof input.title !== "string") {
        return NextResponse.json({ error: "Title must be text." }, { status: 400 });
      }
      const title = input.title.trim();
      if (title.length < 1 || title.length > 120) {
        return NextResponse.json({ error: "Conversation title must be 1–120 characters." }, { status: 400 });
      }
      updates.title = title;
    }

    if ("archived" in input) {
      if (typeof input.archived !== "boolean") {
        return NextResponse.json({ error: "Archived must be true or false." }, { status: 400 });
      }
      updates.archived_at = input.archived ? new Date().toISOString() : null;
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: "Provide a title or archived value." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .update(updates)
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .select("id,title,assistant_key,archived_at,created_at,updated_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to update conversation." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    return NextResponse.json(
      { conversation: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Invalid request or conversation service unavailable." }, { status: 400 });
  }
}
