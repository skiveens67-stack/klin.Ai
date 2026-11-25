import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4",
  "audio/aac", "audio/flac", "audio/x-wav", "audio/mp3",
]);

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to use voice input." }, { status: 401 });
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Deepgram is not configured on this deployment." }, { status: 503 });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
      return NextResponse.json({ error: "Recording is too large. Maximum size is 4 MB." }, { status: 413 });
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size < 1) {
      return NextResponse.json({ error: "Attach a voice recording to transcribe." }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Recording is too large. Maximum size is 4 MB." }, { status: 413 });
    }

    const mimeType = audio.type.split(";")[0].trim().toLowerCase();
    if (!SUPPORTED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported audio format. Record using a browser-supported audio format." }, { status: 415 });
    }

    const upstream = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": mimeType,
        },
        body: await audio.arrayBuffer(),
        signal: AbortSignal.timeout(25000),
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      return NextResponse.json({
        error: upstream.status === 401 || upstream.status === 403
          ? "Deepgram rejected the configured API key."
          : upstream.status === 429
            ? "Deepgram is rate-limiting requests. Wait a moment and try again."
            : "Deepgram could not transcribe this recording. Try a clearer or shorter recording.",
      }, { status: upstream.status === 429 ? 429 : 502 });
    }

    const result = await upstream.json() as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
    };
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    if (!transcript) {
      return NextResponse.json({ error: "No speech was detected. Try speaking closer to your microphone." }, { status: 422 });
    }

    return NextResponse.json({ transcript, provider: "deepgram", model: "nova-3" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Voice transcription timed out or the service could not be reached." }, { status: 503 });
  }
}
