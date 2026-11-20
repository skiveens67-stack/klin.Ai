import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ actionId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const { actionId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(actionId)) return NextResponse.json({ error: "Invalid action id." }, { status: 400 });
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    const status = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
    if (status !== "approved" && status !== "canceled") return NextResponse.json({ error: "Status must be approved or canceled." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const update = status === "approved"
      ? { status, approved_at: new Date().toISOString() }
      : { status };
    const { data, error } = await supabase.from("scheduled_actions").update(update)
      .eq("id", actionId).eq("user_id", user.id).eq("status", "pending_approval")
      .select("id,status,approved_at,run_at").maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to update scheduled action." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Pending action not found." }, { status: 404 });
    return NextResponse.json({ action: data, note: "Approval is recorded. No external action executes until its provider worker is configured." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
