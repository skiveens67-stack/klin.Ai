import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  let user: User | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.getUser();
    if (!result.error) user = result.data.user;
  } catch {
    redirect("/login?error=configuration");
  }
  if (!user) redirect("/login");
  return user;
}
