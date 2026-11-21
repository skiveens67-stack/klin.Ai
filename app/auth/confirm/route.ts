import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || tokenHash.length > 512 || type !== "signup") {
    return NextResponse.redirect(new URL("/login?error=callback", request.url));
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" });
    if (!error) return NextResponse.redirect(new URL("/?verified=1", request.url));
  } catch {
    // Do not expose verification token or provider errors.
  }
  return NextResponse.redirect(new URL("/login?error=callback", request.url));
}
