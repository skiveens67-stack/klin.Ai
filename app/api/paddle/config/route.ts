import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.next_public_paddle_client_token;

  // This route intentionally exposes only a Paddle client-side sandbox token.
  // Paddle client-side tokens are designed for frontend use; API keys are not.
  if (!token || !token.startsWith("test_")) {
    return NextResponse.json(
      { error: "Paddle Sandbox is not configured on this deployment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !user.email_confirmed_at) {
      return NextResponse.json(
        { error: "A verified Klin account is required for checkout." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { client_token: token, user_id: user.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to verify the Klin account for checkout." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
