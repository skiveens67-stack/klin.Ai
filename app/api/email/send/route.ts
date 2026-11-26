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
    const body = await request.json() as { from?: string; to?: string; subject?: string; text?: string };
    const from = (body.from ?? "").trim();
    const to = (body.to ?? "").trim();
    const subject = (body.subject ?? "").trim();
    const text = (body.text ?? "").trim();
    const fromMatch = from.match(/<([^<>\s]+@[^<>\s]+)>$/) ?? from.match(/^([^<>\s]+@[^<>\s]+)$/);
    const sender = fromMatch?.[1] ?? "";
    const domain = sender.split("@")[1]?.toLowerCase();
    if (!domain || sender.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) return NextResponse.json({ error: "Enter a valid sender address on your connected domain." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) return NextResponse.json({ error: "Enter a valid recipient email address." }, { status: 400 });
    if (!subject || subject.length > 200 || !text || text.length > 20000) return NextResponse.json({ error: "Add a subject and message (up to 20,000 characters)." }, { status: 400 });

    const db = adminClient();
    const { data: owned, error: dbError } = await db.from("user_email_domains")
      .select("resend_domain_id,status").eq("user_id", user.id).eq("domain", domain).single();
    if (dbError || !owned) return NextResponse.json({ error: "Connect and verify this sending domain first." }, { status: 403 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email provider is not configured." }, { status: 503 });

    const domainResponse = await fetch("https://api.resend.com/domains/" + owned.resend_domain_id, {
      headers: { Authorization: "Bearer " + apiKey }, cache: "no-store",
    });
    const domainInfo = await domainResponse.json() as { status?: string; name?: string };
    if (!domainResponse.ok || domainInfo.status !== "verified" || domainInfo.name?.toLowerCase() !== domain) {
      return NextResponse.json({ error: "This domain is not verified for sending yet." }, { status: 409 });
    }
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    const result = await sent.json() as { id?: string; message?: string; error?: string };
    if (!sent.ok) return NextResponse.json({ error: result.message || result.error || "Email could not be sent." }, { status: sent.status || 502 });
    return NextResponse.json({ id: result.id, message: "Email accepted by the sending provider." });
  } catch {
    return NextResponse.json({ error: "Unable to send this email." }, { status: 500 });
  }
}
