import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>["auth"]["getUser"]>>["data"]["user"] = null;
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
