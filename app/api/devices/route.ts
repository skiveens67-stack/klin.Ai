import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("devices")
      .select("id,device_type,name,serial_number,status,last_seen_at,firmware_version,metadata,created_at")
      .eq("owner_user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: "Unable to load devices." }, { status: 500 });
    return NextResponse.json({ devices: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Device service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const deviceType = input.device_type;
    const name = input.name;
    if (typeof deviceType !== "string" || !["thangie_rover","drone","incense_tracker"].includes(deviceType)) return NextResponse.json({ error: "Invalid device type." }, { status: 400 });
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) return NextResponse.json({ error: "Device name must be 1–80 characters." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data, error } = await supabase.from("devices")
      .insert({ owner_user_id: user.id, device_type: deviceType, name: name.trim() })
      .select("id,device_type,name,status,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to register device." }, { status: 500 });
    return NextResponse.json({ device: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
