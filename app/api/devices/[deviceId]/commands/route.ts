import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_PARAMETERS_BYTES = 4 * 1024;
const RESERVED_SAFETY_COMMANDS = new Set(["emergency_stop", "emergency-stop", "estop", "e_stop"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }

    const body: unknown = JSON.parse(rawBody);
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const allowedFields = new Set(["command_type", "parameters"]);
    if (Object.keys(body).some((key) => !allowedFields.has(key))) {
      return NextResponse.json({ error: "Unexpected command fields." }, { status: 400 });
    }

    const { deviceId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(deviceId)) {
      return NextResponse.json({ error: "Invalid device id." }, { status: 400 });
    }

    const commandType = body.command_type;
    if (
      typeof commandType !== "string" ||
      !/^[a-z][a-z0-9_]{1,39}$/.test(commandType) ||
      RESERVED_SAFETY_COMMANDS.has(commandType.toLowerCase())
    ) {
      return NextResponse.json({ error: "Invalid or reserved command type." }, { status: 400 });
    }

    const parameters = body.parameters === undefined ? {} : body.parameters;
    if (!isRecord(parameters)) {
      return NextResponse.json({ error: "Command parameters must be a JSON object." }, { status: 400 });
    }
    if (new TextEncoder().encode(JSON.stringify(parameters)).byteLength > MAX_PARAMETERS_BYTES) {
      return NextResponse.json({ error: "Command parameters are too large." }, { status: 413 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: device } = await supabase
      .from("devices")
      .select("id,device_type,status")
      .eq("id", deviceId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (!device) {
      return NextResponse.json({ error: "Device not found." }, { status: 404 });
    }
    if (device.status !== "online") {
      return NextResponse.json({ error: "Device is not online. Commands cannot be queued." }, { status: 409 });
    }

    if (device.device_type === "thangie_rover" && "speed_mph" in parameters) {
      const speed = Number(parameters.speed_mph);
      if (!Number.isFinite(speed) || speed < 0 || speed > 1.5) {
        return NextResponse.json({ error: "Thangie rover speed is limited to 1.5 mph." }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("device_commands")
      .insert({
        device_id: deviceId,
        requested_by_user_id: user.id,
        command_type: commandType,
        parameters,
        status: "pending_approval",
        requires_confirmation: true,
        expires_at: new Date(Date.now() + 120000).toISOString(),
      })
      .select("id,device_id,command_type,parameters,status,requires_confirmation,expires_at,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to queue device command." }, { status: 500 });
    }

    return NextResponse.json(
      {
        command: data,
        note: "Command is recorded for a future authenticated device gateway. This API does not directly actuate hardware. Emergency-stop commands must use a separate safety channel.",
      },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request or device service unavailable." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
