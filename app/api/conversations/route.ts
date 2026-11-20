import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const MAX_CREATE_BODY_BYTES = 4 * 1024;

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const archivedFilter = new URL(request.url).searchParams.get("archived") ?? "false";
    if (!["true", "false", "all"].includes(archivedFilter)) {
      return NextResponse.json({ error: "archived must be true, false, or all." }, { status: 400 });
    }

    let conversationsQuery = supabase.from("conversations")
      .select("id,title,assistant_key,archived_at,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (archivedFilter === "true") {
      conversationsQuery = conversationsQuery.not("archived_at", "is", null);
    } else if (archivedFilter === "false") {
      conversationsQuery = conversationsQuery.is("archived_at", null);
    }
    const { data, error } = await conversationsQuery;
    if (error) return NextResponse.json({ error: "Unable to load conversations." }, { status: 500 });
    return NextResponse.json({ conversations: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Conversation service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_CREATE_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    const body: unknown = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "New conversation";
    if (title.length < 1 || title.length > 120) return NextResponse.json({ error: "Conversation title must be 1–120 characters." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data, error } = await supabase.from("conversations")
      .insert({ user_id: user.id, title, assistant_key: "klinie" })
      .select("id,title,assistant_key,created_at,updated_at").single();
    if (error) return NextResponse.json({ error: "Unable to create conversation." }, { status: 500 });
    return NextResponse.json({ conversation: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
