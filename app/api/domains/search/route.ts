import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TLDS = ["com", "net", "org", "co", "io", "dev", "app", "ai", "xyz", "online", "website", "tech", "me", "site"];

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in to search domains." }, { status: 401 });

    const body = await request.json() as { name?: string };
    const input = (body.name ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const base = input.includes(".") ? input.split(".")[0] : input;
    const clean = base.normalize("NFKD").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 55);
    if (clean.length < 2) return NextResponse.json({ error: "Enter at least two letters or numbers." }, { status: 400 });

    const candidates = input.includes(".") && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(input)
      ? [input]
      : TLDS.map((tld) => clean + "." + tld);

    const response = await fetch("https://api.vercel.com/v1/registrar/domains/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domains: candidates }),
      cache: "no-store",
    });
    const payload = await response.json() as { results?: Array<{ domain: string; available: boolean; years?: number; price?: number; renewalPrice?: number; premium?: boolean }> };
    if (!response.ok) return NextResponse.json({ error: "The domain price service is temporarily unavailable." }, { status: 502 });

    const results = (payload.results ?? []).map((item) => ({
      domain: item.domain,
      available: item.available,
      years: item.years ?? 1,
      registrationPrice: item.price ?? null,
      renewalPrice: item.renewalPrice ?? null,
      premium: Boolean(item.premium),
      currency: "USD",
    })).sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return (a.renewalPrice ?? Number.MAX_SAFE_INTEGER) - (b.renewalPrice ?? Number.MAX_SAFE_INTEGER);
    });
    return NextResponse.json({ results, source: "Vercel Registrar", note: "Prices are from Vercel's registrar catalog; compare other registrars before purchasing." });
  } catch {
    return NextResponse.json({ error: "Unable to search domains right now." }, { status: 500 });
  }
}
