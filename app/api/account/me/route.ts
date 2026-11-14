import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PROFILE_FIELDS =
  "id, full_name, username, display_name, email, phone, email_verified_at, phone_verified_at, account_activated_at, waitlist_position, referral_code, avatar_url, bio";

type EditableProfile = {
  full_name?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  bio?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateProfileUpdate(
  input: unknown,
): { value?: EditableProfile; error?: string } {
  if (!isRecord(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const allowed = new Set([
    "full_name",
    "username",
    "display_name",
    "avatar_url",
    "bio",
  ]);
  const keys = Object.keys(input);

  if (keys.length === 0) {
    return { error: "Provide at least one profile field to update." };
  }

  if (keys.some((key) => !allowed.has(key))) {
    return { error: "One or more profile fields cannot be changed here." };
  }

  const value: EditableProfile = {};

  for (const key of keys) {
    const field = input[key];

    if (key === "full_name" || key === "display_name" || key === "username") {
      if (typeof field !== "string") {
        return { error: `${key} must be text.` };
      }

      const normalized = field.trim();

      if (key === "full_name" && (normalized.length < 1 || normalized.length > 100)) {
        return { error: "Full name must be between 1 and 100 characters." };
      }
      if (key === "display_name" && (normalized.length < 1 || normalized.length > 40)) {
        return { error: "Display name must be between 1 and 40 characters." };
      }
      if (key === "username" && !/^[a-z0-9_]{3,20}$/.test(normalized)) {
        return { error: "Username must be 3–20 lowercase letters, numbers, or underscores." };
      }

      value[key] = normalized;
      continue;
    }

    if (key === "bio") {
      if (field !== null && typeof field !== "string") {
        return { error: "Bio must be text or null." };
      }
      const bio = typeof field === "string" ? field.trim() : null;
      if (bio && bio.length > 300) {
        return { error: "Bio cannot exceed 300 characters." };
      }
      value.bio = bio;
      continue;
    }

    if (key === "avatar_url") {
      if (field !== null && typeof field !== "string") {
        return { error: "Avatar URL must be a URL or null." };
      }
      if (typeof field === "string") {
        try {
          const url = new URL(field);
          if (url.protocol !== "https:") {
            return { error: "Avatar URL must use HTTPS." };
          }
        } catch {
          return { error: "Avatar URL must be a valid HTTPS URL." };
        }
      }
      value.avatar_url = field as string | null;
    }
  }

  return { value };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Unable to load account profile." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Account profile not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { profile },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Account service is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = validateProfileUpdate(body);

    if (validation.error || !validation.value) {
      return NextResponse.json(
        { error: validation.error ?? "Invalid profile update." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(validation.value)
      .eq("id", user.id)
      .select(PROFILE_FIELDS)
      .maybeSingle();

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "That username is already in use." },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }

      return NextResponse.json(
        { error: "Unable to update account profile." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Account profile not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { profile },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request or account service unavailable." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
