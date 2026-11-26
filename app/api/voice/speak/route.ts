import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  const parsed = await readLimitedJson(request, 24 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return NextResponse.json({ error: "Invalid speech request." }, { status: 400 });
  }

  const input = parsed.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "text")) {
    return NextResponse.json({ error: "Unexpected speech request field." }, { status: 400 });
  }
  if (typeof input.text !== "string" || input.text.trim().length < 1 || input.text.length > 5000) {
    return NextResponse.json({ error: "Text must be 1–5,000 characters." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to use voice playback." }, { status: 401 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY || process.env.deepgram_api_key;
    if (!apiKey) {
      return NextResponse.json({ error: "Deepgram is not configured on this deployment." }, { status: 503 });
    }

    const upstream = await fetch("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: input.text.trim() }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({
        error: upstream.status === 401 || upstream.status === 403
          ? "Deepgram rejected the configured API key."
          : upstream.status === 429
            ? "Deepgram is rate-limiting requests. Wait a moment and try again."
            : "Deepgram could not generate speech for this response.",
      }, { status: upstream.status === 429 ? 429 : 502 });
    }

    const audio = await upstream.arrayBuffer();
    if (!audio.byteLength) {
      return NextResponse.json({ error: "Deepgram returned an empty audio response." }, { status: 502 });
    }

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
        "X-Klin-Voice-Provider": "deepgram",
        "X-Klin-Voice-Model": "aura-2-thalia-en",
      },
    });
  } catch {
    return NextResponse.json({ error: "Speech generation timed out or the service could not be reached." }, { status: 503 });
  }
}
