import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const familyId = input.family_id;
    const displayName = input.display_name;
    const ageBand = input.age_band ?? "unknown";
    if (typeof familyId !== "string" || !/^[0-9a-f-]{36}$/i.test(familyId)) return NextResponse.json({ error: "Valid family_id is required." }, { status: 400 });
    if (typeof displayName !== "string" || displayName.trim().length < 1 || displayName.trim().length > 40) return NextResponse.json({ error: "Display name must be 1–40 characters." }, { status: 400 });
    if (typeof ageBand !== "string" || !["under_13","13_15","16_17","18_plus","unknown"].includes(ageBand)) return NextResponse.json({ error: "Invalid age band." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data, error } = await supabase.from("managed_profiles")
      .insert({ family_id: familyId, display_name: displayName.trim(), age_band: ageBand })
      .select("id,family_id,display_name,age_band,avatar_url,controls,created_at").single();

    if (error) {
      if (error.message.includes("at most five")) return NextResponse.json({ error: "A family can have at most five managed profiles." }, { status: 409 });
      return NextResponse.json({ error: "Unable to create managed profile. Confirm you own this family." }, { status: 403 });
    }
    return NextResponse.json({ profile: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request or family service unavailable." }, { status: 400 });
  }
}
