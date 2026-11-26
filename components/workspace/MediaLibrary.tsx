"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { FileImage, FilePlus2, RefreshCw } from "lucide-react";

type Asset = {
  id: string;
  asset_type: string;
  content_type: string;
  size_bytes: number;
  status: string;
  created_at: string;
};

type UploadUrlResponse = {
  asset: { id: string };
  upload: { path: string; token: string; signed_url: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageProvider, setImageProvider] = useState<"klin" | "gemini">("klin");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ image: string; provider: string; model?: string; note?: string } | null>(null);
  const [imageError, setImageError] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/media/assets", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json() as { assets?: Asset[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load your media library.");
      setAssets(data.assets ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your media library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const uploadFile = async () => {
    if (!file || uploading) return;
    setError("");
    setNotice("");
    if (file.size < 1 || file.size > 100 * 1024 * 1024) {
      setError("Choose a file between 1 byte and 100 MB.");
      return;
    }
    setUploading(true);
    try {
      const request = await fetch("/api/media/upload-url", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_type: file.type, size_bytes: file.size }),
      });
      const data = await request.json() as UploadUrlResponse & { error?: string };
      if (!request.ok) throw new Error(data.error || "Unable to prepare secure upload.");

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("klin-user-assets")
        .uploadToSignedUrl(data.upload.path, data.upload.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const confirm = await fetch(`/api/media/assets/${data.asset.id}/confirm`, {
        method: "POST",
        credentials: "same-origin",
      });
      const confirmed = await confirm.json() as { error?: string };
      if (!confirm.ok) throw new Error(confirmed.error || "The file uploaded but could not be confirmed.");

      setNotice("Upload completed and the stored file metadata was confirmed.");
      setFile(null);
      const input = document.getElementById("media-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadAssets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || generatingImage) return;
    setGeneratingImage(true);
    setImageError("");
    setGeneratedImage(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (imageProvider === "gemini") headers["x-gemini-api-key"] = geminiApiKey.trim();
      const response = await fetch("/api/creative/image", {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({ prompt: imagePrompt.trim(), provider: imageProvider }),
      });
      const data = await response.json() as { image?: string; provider?: string; model?: string; note?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.error || "Image generation failed.");
      setGeneratedImage({ image: data.image, provider: data.provider ?? imageProvider, model: data.model, note: data.note });
    } catch (caught) {
      setImageError(caught instanceof Error ? caught.message : "Image generation failed.");
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <main className="module-page">
      <header className="module-header">
        <div><div className="module-eyebrow">KLIN WORKSPACE</div><h1>Creative Studio</h1><p>Manage private media assets for your projects. AI image generation is available through Klin or your Gemini API key. Video generation is coming soon.</p></div>
        <button type="button" className="module-refresh" onClick={() => void loadAssets()} disabled={loading || uploading}><RefreshCw size={15} /> Refresh</button>
      </header>

      <div className="module-note">Private uploads only. Supported types: JPEG, PNG, WebP, GIF, MP4, WebM, MP3, WAV, M4A, and PDF. Maximum file size: 100 MB.</div>

      <section className="module-card">
        <div className="module-card-title"><FileImage size={18} /><h2>AI Image Creator</h2></div>
        <p className="offline-drafts-copy">Create a new picture with Klin&apos;s configured image model, or use your own Gemini API key. Gemini keys are sent only for the current request and are not saved in Klin.</p>
        <div className="module-form">
          <div className="module-field"><label htmlFor="image-provider">Image provider</label><select id="image-provider" value={imageProvider} onChange={(event) => { setImageProvider(event.target.value as "klin" | "gemini"); setGeneratedImage(null); setImageError(""); }}><option value="klin">Klin Image Creator</option><option value="gemini">Use my Gemini API key</option></select></div>
          {imageProvider === "gemini" && <div className="module-field"><label htmlFor="gemini-api-key">Gemini API key (used once, not saved)</label><input id="gemini-api-key" type="password" autoComplete="off" value={geminiApiKey} onChange={(event) => setGeminiApiKey(event.target.value)} placeholder="Paste your Gemini API key" /></div>}
          <div className="module-field"><label htmlFor="image-prompt">Describe the picture</label><textarea id="image-prompt" rows={4} maxLength={3000} value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Describe the image, art style, colors, lighting and composition…" /></div>
          <button className="module-submit" type="button" disabled={generatingImage || imagePrompt.trim().length < 4 || (imageProvider === "gemini" && geminiApiKey.trim().length < 20)} onClick={() => void generateImage()}>{generatingImage ? "Drawing your picture…" : "Generate image"}</button>
        </div>
        {imageError && <div className="module-alert module-alert-error" role="alert">{imageError}</div>}
        {generatedImage && <div className="mt-4"><Image src={generatedImage.image} alt="Image generated with Klin" width={1024} height={1024} unoptimized className="w-full rounded-xl border border-white/10" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">Created with {generatedImage.provider}{generatedImage.model ? ` · ${generatedImage.model}` : ""}</span><a className="rounded-lg border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100" href={generatedImage.image} download="klin-image.png">Download picture</a></div>{generatedImage.note && <p className="offline-privacy-note">{generatedImage.note}</p>}</div>}
      </section>

      <section className="module-card">
        <div className="module-card-title"><span className="module-count">COMING SOON</span><h2>AI Video Creator</h2></div>
        <p className="offline-drafts-copy">Video generation is being prepared for Klin early access. Video creation stays unavailable until a video provider, pricing controls and safety checks are connected.</p>
      </section>


      <div className="module-alert module-alert-warning">Upload confirmation checks the stored size and content type. File-signature inspection, malware scanning, media re-encoding, and moderation are not yet enabled. Do not upload sensitive or untrusted files.</div>
      {error && <div className="module-alert module-alert-error" role="alert">{error}</div>}
      {notice && <div className="module-alert module-alert-info" role="status">{notice}</div>}

      <section className="module-card media-upload-card">
        <div className="module-card-title"><FilePlus2 size={17} /><h2>Upload an asset</h2></div>
        <label className="media-file-picker" htmlFor="media-file">
          <FileImage size={22} />
          <span>{file ? file.name : "Choose a file from your device"}</span>
          <small>{file ? formatSize(file.size) : "Private storage · Up to 100 MB"}</small>
        </label>
        <input id="media-file" className="media-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/mp4,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className="module-submit" type="button" disabled={!file || uploading} onClick={() => void uploadFile()}>{uploading ? "Uploading and confirming…" : "Upload privately"}</button>
      </section>

      <section className="module-card">
        <div className="module-card-title"><h2>Your media assets</h2><span className="module-count">{assets.length}</span></div>
        {loading ? <p className="module-empty">Loading assets…</p> : assets.length === 0 ? <p className="module-empty">No media assets uploaded yet.</p> : (
          <div className="module-record-list">
            {assets.map((asset) => (
              <article className="module-record" key={asset.id}>
                <div className="module-record-title">{asset.asset_type} asset</div>
                <dl>
                  <div><dt>Content type</dt><dd>{asset.content_type}</dd></div>
                  <div><dt>Size</dt><dd>{formatSize(asset.size_bytes)}</dd></div>
                  <div><dt>Status</dt><dd>{asset.status}</dd></div>
                  <div><dt>Created</dt><dd>{new Date(asset.created_at).toLocaleString()}</dd></div>
                  <div><dt>Asset ID</dt><dd>{asset.id}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
