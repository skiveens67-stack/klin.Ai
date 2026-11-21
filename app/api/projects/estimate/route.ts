import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { estimateBuild, type BuildProjectType } from "@/lib/project-estimator";

export const dynamic = "force-dynamic";

const PROJECT_TYPES = new Set(["website", "video_app", "mobile_app", "game", "business", "other"]);

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid estimate request." }, { status: 400 });
  }

  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["project_type", "feature_count", "integrations_count", "asset_count"].includes(key))) {
    return NextResponse.json({ error: "Unexpected estimate field." }, { status: 400 });
  }
  if (typeof input.project_type !== "string" || !PROJECT_TYPES.has(input.project_type)) {
    return NextResponse.json({ error: "Choose a supported project type." }, { status: 400 });
  }

  const counts = [input.feature_count, input.integrations_count, input.asset_count];
  if (counts.some((value) => !Number.isInteger(value) || Number(value) < 0 || Number(value) > 100)) {
    return NextResponse.json({ error: "Feature, integration, and asset counts must be whole numbers from 0 to 100." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const estimate = estimateBuild({
      project_type: input.project_type as BuildProjectType,
      feature_count: Number(input.feature_count),
      integrations_count: Number(input.integrations_count),
      asset_count: Number(input.asset_count),
    });

    return NextResponse.json({
      estimate,
      billing_notice: "Estimate only. Klin must disclose the $7–$35 price for each 10 active-hour block and obtain your approval before paid work starts. At each block boundary, Klin will notify you and allow 30 minutes to pay. If payment is not confirmed, the project pauses with its saved checkpoint. Idle and paused time are not billable.",
      execution_status: "builder_not_connected",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Build estimate service unavailable." }, { status: 503 });
  }
}
