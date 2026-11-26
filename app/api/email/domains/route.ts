import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server database configuration is missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data, error: dbError } = await adminClient().from("user_email_domains")
      .select("id,domain,resend_domain_id,status,dns_records,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (dbError) throw dbError;
    return NextResponse.json({ domains: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to load your email domains." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const body = await request.json() as { domain?: string };
    const domain = (body.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
      return NextResponse.json({ error: "Enter a valid domain name, such as example.com." }, { status: 400 });
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email sending is not configured on this deployment yet." }, { status: 503 });

    const created = await fetch("https://api.resend.com/domains", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain, region: "us-east-1", capabilities: { sending: "enabled", receiving: "disabled" } }),
    });
    const result = await created.json() as { id?: string; name?: string; status?: string; records?: unknown[]; message?: string; error?: string };
    if (!created.ok || !result.id) return NextResponse.json({ error: result.message || result.error || "Resend could not add this domain. Check whether it is already registered." }, { status: created.status || 502 });

    const db = adminClient();
    const { data, error: dbError } = await db.from("user_email_domains").insert({
      user_id: user.id, domain, resend_domain_id: result.id,
      status: result.status === "verified" ? "verified" : "pending",
      dns_records: result.records ?? [],
    }).select("id,domain,resend_domain_id,status,dns_records,created_at").single();
    if (dbError) {
      await fetch("https://api.resend.com/domains/" + result.id, { method: "DELETE", headers: { Authorization: "Bearer " + apiKey } }).catch(() => undefined);
      if (dbError.code === "23505") return NextResponse.json({ error: "This domain is already connected to a Klin account." }, { status: 409 });
      throw dbError;
    }
    return NextResponse.json({ domain: data, message: "Add the DNS records below at your domain registrar, then verify the domain." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to connect this domain. Try again." }, { status: 500 });
  }
}
