import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login");
  } catch {
    redirect("/login?error=configuration");
  }

  return <AppShell />;
}
