import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const { deviceId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(deviceId)) return NextResponse.json({ error: "Invalid device id." }, { status: 400 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    if (typeof input.command_type !== "string" || !/^[a-z][a-z0-9_]{1,39}$/.test(input.command_type)) return NextResponse.json({ error: "Invalid command type." }, { status: 400 });
    const parameters = input.parameters && typeof input.parameters === "object" && !Array.isArray(input.parameters) ? input.parameters : {};
    
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: device } = await supabase.from("devices").select("id,device_type,status").eq("id", deviceId).eq("owner_user_id", user.id).maybeSingle();
    if (!device) return NextResponse.json({ error: "Device not found." }, { status: 404 });
    if (device.status !== "online") return NextResponse.json({ error: "Device is not online. Commands cannot be queued." }, { status: 409 });

    if (device.device_type === "thangie_rover" && "speed_mph" in (parameters as Record<string, unknown>)) {
      const speed = Number((parameters as Record<string, unknown>).speed_mph);
      if (!Number.isFinite(speed) || speed < 0 || speed > 1.5) return NextResponse.json({ error: "Thangie rover speed is limited to 1.5 mph." }, { status: 400 });
    }

    const { data, error } = await supabase.from("device_commands").insert({
      device_id: deviceId,
      requested_by_user_id: user.id,
      command_type: input.command_type,
      parameters,
      status: "pending_approval",
      requires_confirmation: true,
      expires_at: new Date(Date.now() + 120000).toISOString(),
    }).select("id,device_id,command_type,parameters,status,requires_confirmation,expires_at,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to queue device command." }, { status: 500 });
    return NextResponse.json({ command: data, note: "Command is recorded for a future authenticated device gateway. This API does not directly actuate hardware." }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid request or device service unavailable." }, { status: 400 });
  }
}
