import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";
import { KLIN_V7_SAFETY_POLICY } from "@/lib/klin-v7-safety";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GeminiInteractionResponse = {
  output_image?: { data?: string; mime_type?: string };
  steps?: Array<{ type?: string; content?: Array<{ type?: string; data?: string; mime_type?: string }> }>;
};
type GatewayImageResponse = { data?: Array<{ b64_json?: string; url?: string }> };

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const parsed = await readLimitedJson(request, 12 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid image request." }, { status: 400 });
  }
  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["prompt", "provider"].includes(key))) {
    return NextResponse.json({ error: "Unexpected image request field." }, { status: 400 });
  }
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const provider = input.provider;
  if (prompt.length < 4 || prompt.length > 3000) return NextResponse.json({ error: "Describe the image in 4–3,000 characters." }, { status: 400 });
  if (provider !== "klin" && provider !== "gemini") return NextResponse.json({ error: "Choose Klin Image or Gemini." }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to create images." }, { status: 401 });
    if (!user.email_confirmed_at) return NextResponse.json({ error: "Verify your email before generating images." }, { status: 403 });

    const safePrompt = [
      KLIN_V7_SAFETY_POLICY,
      "IMAGE REQUEST SAFETY: do not create non-consensual intimate imagery, deceptive impersonation, sexualized depictions of minors, targeted harassment, or imagery intended to facilitate crime or abuse.",
      "Create one original image based on this user prompt:",
      prompt,
    ].join("\n\n");

    if (provider === "gemini") {
      const apiKey = request.headers.get("x-gemini-api-key")?.trim();
      if (!apiKey || apiKey.length < 20 || apiKey.length > 256 || /\s/.test(apiKey)) {
        return NextResponse.json({ error: "Enter a valid Gemini API key. Klin uses it only for this request and does not save it." }, { status: 400 });
      }
      const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model,
          input: [{ type: "text", text: safePrompt }],
          response_format: { type: "image", mime_type: "image/png", aspect_ratio: "1:1", image_size: "1K" },
        }),
        signal: AbortSignal.timeout(55000),
        cache: "no-store",
      });
      if (!response.ok) return NextResponse.json({ error: response.status === 400 || response.status === 403 ? "Gemini rejected the API key or request. Check your key and image-generation access." : response.status === 429 ? "Gemini rate limit reached. Try again later." : "Gemini image generation is temporarily unavailable." }, { status: response.status === 429 ? 429 : 502 });
      const data = await response.json() as GeminiInteractionResponse;
      const imagePart = data.output_image?.data
        ? data.output_image
        : data.steps?.flatMap((step) => step.content ?? []).find((part) => part.type === "image" && part.data);
      if (!imagePart?.data || imagePart.data.length > 14_000_000) {
        return NextResponse.json({ error: "Gemini did not return an image. Try a clearer prompt or another image model." }, { status: 502 });
      }
      const mime = imagePart.mime_type === "image/jpeg" ? "image/jpeg" : "image/png";
      return NextResponse.json({ image: `data:${mime};base64,${imagePart.data}`, provider: "gemini", model, note: "Generated with your Gemini API key. The key was used for this request only and was not stored." }, { headers: { "Cache-Control": "no-store" } });
    }

    const gatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
    if (!gatewayKey) return NextResponse.json({ error: "Klin's image provider is not configured on this deployment yet. You can use Gemini with your own API key in the meantime." }, { status: 503 });
    const model = process.env.XZELLO_IMAGE_MODEL || process.env.KLIN_IMAGE_MODEL || "minimax/minimax-h3-image";
    const response = await fetch("https://ai-gateway.vercel.sh/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: safePrompt, n: 1, size: "1024x1024", response_format: "b64_json" }),
      signal: AbortSignal.timeout(55000),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: response.status === 402 ? "Klin image-generation credits or spending limit are exhausted." : response.status === 429 ? "Klin image provider is rate limited. Try again later." : "Klin's configured image model is unavailable." }, { status: response.status === 429 ? 429 : 502 });
    const data = await response.json() as GatewayImageResponse;
    const image = data.data?.[0]?.b64_json;
    if (!image || image.length > 14_000_000) return NextResponse.json({ error: "Klin's image provider returned no supported image." }, { status: 502 });
    return NextResponse.json({ image: `data:image/png;base64,${image}`, provider: "klin", model }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Image generation timed out or the provider could not be reached." }, { status: 503 });
  }
}
