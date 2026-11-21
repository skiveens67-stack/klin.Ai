import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin, readLimitedJson } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, { assetType: string; extension: string }> = {
  "image/jpeg": { assetType: "image", extension: "jpg" },
  "image/png": { assetType: "image", extension: "png" },
  "image/webp": { assetType: "image", extension: "webp" },
  "image/gif": { assetType: "image", extension: "gif" },
  "video/mp4": { assetType: "video", extension: "mp4" },
  "video/webm": { assetType: "video", extension: "webm" },
  "audio/mpeg": { assetType: "audio", extension: "mp3" },
  "audio/wav": { assetType: "audio", extension: "wav" },
  "audio/mp4": { assetType: "audio", extension: "m4a" },
  "application/pdf": { assetType: "document", extension: "pdf" },
};

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const parsed = await readLimitedJson(request, 4096);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const body: unknown = parsed.value;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    const input = body as Record<string, unknown>;
    const mime = input.content_type;
    const size = Number(input.size_bytes);
    if (typeof mime !== "string" || !(mime in MIME_TYPES)) return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
    if (!Number.isSafeInteger(size) || size < 1 || size > 104857600) return NextResponse.json({ error: "File size must be between 1 byte and 100 MB." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const descriptor = MIME_TYPES[mime];
    const path = `${user.id}/${crypto.randomUUID()}.${descriptor.extension}`;
    const { data: signed, error: signedError } = await supabase.storage.from("klin-user-assets").createSignedUploadUrl(path);
    if (signedError || !signed) return NextResponse.json({ error: "Unable to create a secure upload URL." }, { status: 503 });

    const admin = createSupabaseAdminClient();
    const { data: asset, error: assetError } = await admin.from("media_assets").insert({
      user_id: user.id, asset_type: descriptor.assetType, storage_bucket: "klin-user-assets",
      storage_path: path, content_type: mime, size_bytes: size, status: "uploading",
    }).select("id,asset_type,storage_bucket,storage_path,status,size_bytes,content_type,created_at").single();
    if (assetError) return NextResponse.json({ error: "Unable to register media asset." }, { status: 500 });

    return NextResponse.json({ asset, upload: { path, token: signed.token, signed_url: signed.signedUrl } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Media upload service unavailable." }, { status: 503 });
  }
}
