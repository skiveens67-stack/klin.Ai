import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { estimateBuild, type BuildComplexity, type BuildProjectType } from "@/lib/project-estimator";

export const dynamic = "force-dynamic";

const PROJECT_TYPES = new Set(["website", "video_app", "mobile_app", "game", "business", "other"]);
const COMPLEXITIES = new Set(["starter", "standard", "advanced", "heavy"]);

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 4096);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid estimate request." }, { status: 400 });
  }
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["project_type", "complexity", "feature_count", "integrations_count", "asset_count"].includes(key))) {
    return NextResponse.json({ error: "Unexpected estimate field." }, { status: 400 });
  }
  if (typeof input.project_type !== "string" || !PROJECT_TYPES.has(input.project_type) ||
      typeof input.complexity !== "string" || !COMPLEXITIES.has(input.complexity)) {
    return NextResponse.json({ error: "Choose a supported project type and complexity." }, { status: 400 });
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
      complexity: input.complexity as BuildComplexity,
      feature_count: Number(input.feature_count),
      integrations_count: Number(input.integrations_count),
      asset_count: Number(input.asset_count),
    });
    return NextResponse.json({
      estimate,
      billing_notice: "This is an estimate, not a charge. Each two-hour active build block requires a clear price disclosure and user authorization before billing. No payment has been taken.",
      execution_status: "builder_not_connected",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Build estimate service unavailable." }, { status: 503 });
  }
}
