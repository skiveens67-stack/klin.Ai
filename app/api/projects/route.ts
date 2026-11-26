import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("creator_projects")
      .select("id,project_type,title,description,visibility,status,content_reference,metadata,created_at,updated_at,published_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "Unable to load projects." }, { status: 500 });
    return NextResponse.json({ projects: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Project service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const parsed = await readLimitedJson(request, 16384);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const allowedTypes = ["website","app","game","music","image","video","other"];
    if (typeof input.project_type !== "string" || !allowedTypes.includes(input.project_type)) return NextResponse.json({ error: "Invalid project type." }, { status: 400 });
    if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.trim().length > 120) return NextResponse.json({ error: "Project title must be 1–120 characters." }, { status: 400 });
    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (description.length > 5000) return NextResponse.json({ error: "Project description is too long." }, { status: 400 });

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(idempotencyKey))) {
      return NextResponse.json({ error: "Invalid Idempotency-Key header." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const selectedFields = "id,project_type,title,description,visibility,status,created_at,updated_at";

    if (idempotencyKey) {
      const { data: existing, error: lookupError } = await supabase.from("creator_projects")
        .select(selectedFields).eq("owner_user_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (lookupError) return NextResponse.json({ error: "Unable to verify the project request key. Apply the project idempotency migration before enabling offline sync." }, { status: 503 });
      if (existing) return NextResponse.json({ project: existing, duplicate: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const projectInsert: Record<string, unknown> = {
      owner_user_id: user.id,
      project_type: input.project_type,
      title: input.title.trim(),
      description,
      status: "draft",
      visibility: "private",
    };
    if (idempotencyKey) projectInsert.idempotency_key = idempotencyKey;

    const { data, error } = await supabase.from("creator_projects")
      .insert(projectInsert)
      .select(selectedFields).single();
    if (error?.code === "23505" && idempotencyKey) {
      const { data: existing, error: lookupError } = await supabase.from("creator_projects")
        .select(selectedFields).eq("owner_user_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
      if (!lookupError && existing) return NextResponse.json({ project: existing, duplicate: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    if (error) return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
    return NextResponse.json({ project: data, duplicate: false }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
