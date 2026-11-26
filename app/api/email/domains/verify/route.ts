import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { id } = await request.json() as { id?: string };
    if (!id) return NextResponse.json({ error: "Choose a domain to verify." }, { status: 400 });
    const db = adminClient();
    const { data: owned, error: dbError } = await db.from("user_email_domains")
      .select("id,resend_domain_id,domain").eq("id", id).eq("user_id", user.id).single();
    if (dbError || !owned) return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email provider is not configured." }, { status: 503 });

    const verify = await fetch("https://api.resend.com/domains/" + owned.resend_domain_id + "/verify", {
      method: "POST", headers: { Authorization: "Bearer " + apiKey },
    });
    const verifyData = await verify.json() as { message?: string; error?: string };
    if (!verify.ok) return NextResponse.json({ error: verifyData.message || verifyData.error || "Verification could not start." }, { status: 502 });

    const detailResponse = await fetch("https://api.resend.com/domains/" + owned.resend_domain_id, {
      headers: { Authorization: "Bearer " + apiKey }, cache: "no-store",
    });
    const detail = await detailResponse.json() as { status?: string; records?: unknown[] };
    const status = detail.status === "verified" ? "verified" : detail.status === "failed" ? "failed" : "pending";
    const { data } = await db.from("user_email_domains").update({
      status, dns_records: detail.records ?? [], updated_at: new Date().toISOString(),
    }).eq("id", owned.id).eq("user_id", user.id).select("id,domain,status,dns_records").single();
    return NextResponse.json({ domain: data, message: status === "verified" ? "Domain verified. You can now send email from it." : "DNS verification is still pending. Check the records and try again shortly." });
  } catch {
    return NextResponse.json({ error: "Unable to verify this domain." }, { status: 500 });
  }
}
