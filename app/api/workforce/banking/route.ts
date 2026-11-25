import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await supabase.from("business_banking_intakes").select("id,bank_name,business_name,country_code,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load banking requests." }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const bankName = String(body.bank_name ?? "").trim().slice(0, 120);
  const businessName = String(body.business_name ?? "").trim().slice(0, 120);
  if (bankName.length < 2 || businessName.length < 2) return NextResponse.json({ error: "Enter the bank you want to use and your business's legal name." }, { status: 400 });
  const { data, error } = await supabase.from("business_banking_intakes").insert({ user_id: user.id, bank_name: bankName, business_name: businessName, country_code: "US", status: "partner_required" }).select("id,bank_name,business_name,status,created_at").single();
  if (error) return NextResponse.json({ error: "Could not save your banking preference." }, { status: 500 });
  return NextResponse.json({ request: data, message: "Your preferred bank has been saved. Klin's bank-opening partner connection is not active yet, so this is not an account application and no account has been opened." }, { status: 201 });
}
