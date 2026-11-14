import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ contactId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const { contactId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(contactId)) return NextResponse.json({ error: "Invalid contact id." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { error } = await supabase.from("trusted_contacts").delete().eq("id", contactId).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Unable to remove trusted contact." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Trusted contact service unavailable." }, { status: 503 });
  }
}
