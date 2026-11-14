import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ assetId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  try {
    const { assetId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(assetId)) return NextResponse.json({ error: "Invalid asset id." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: asset, error: assetError } = await supabase.from("media_assets")
      .select("id,storage_bucket,storage_path,status").eq("id", assetId).eq("user_id", user.id).maybeSingle();
    if (assetError || !asset) return NextResponse.json({ error: "Media asset not found." }, { status: 404 });

    const parts = asset.storage_path.split("/");
    const filename = parts.pop();
    const folder = parts.join("/");
    const { data: objects, error: listError } = await supabase.storage.from(asset.storage_bucket)
      .list(folder, { search: filename, limit: 10 });
    if (listError || !objects?.some((object) => object.name === filename)) {
      return NextResponse.json({ error: "Uploaded file was not found. Finish uploading before confirming." }, { status: 409 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("media_assets").update({ status: "uploaded" })
      .eq("id", assetId).eq("user_id", user.id)
      .select("id,asset_type,status,content_type,size_bytes,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to confirm media upload." }, { status: 500 });
    return NextResponse.json({ asset: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Media confirmation failed." }, { status: 503 });
  }
}
