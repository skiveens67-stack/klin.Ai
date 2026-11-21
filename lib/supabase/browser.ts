"use client";

import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Klin sign-in is not configured yet. Set the public Supabase URL and publishable key in the app environment.");
  }
  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}
