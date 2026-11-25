import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import KlinMainMenu from "@/components/home/KlinMainMenu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let userEmail = "";
  let signedIn = false;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (data.user) {
      signedIn = true;
      userEmail = data.user.email ?? "";
    }
  } catch {
    redirect("/login?error=configuration");
  }

  if (!signedIn) redirect("/login");
  return <AppShell userEmail={userEmail}><KlinMainMenu /></AppShell>;
}
