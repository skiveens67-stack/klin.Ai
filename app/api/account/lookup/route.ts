import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to look up a Klin account." }, { status: 401 });
    const accountNumber = new URL(request.url).searchParams.get("accountNumber")?.trim() || "";
    if (!/^\d{6}$/.test(accountNumber)) return NextResponse.json({ error: "Enter a six-digit Klin account number." }, { status: 400 });
    const { data, error } = await supabase.from("klin_profiles")
      .select("username,account_number")
      .eq("account_number", accountNumber).maybeSingle();
    if (error) return NextResponse.json({ error: "Klin account lookup is unavailable. The account identity migration may not be installed." }, { status: 503 });
    if (!data) return NextResponse.json({ error: "No Klin account was found with that number." }, { status: 404 });
    return NextResponse.json({ account: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Klin account lookup is temporarily unavailable." }, { status: 503 });
  }
}
