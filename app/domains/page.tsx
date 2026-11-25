import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DomainEmailWorkspace from "@/components/domains/DomainEmailWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  let userEmail = "";
  let authenticated = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    authenticated = !error && Boolean(user);
    userEmail = user?.email ?? "";
  } catch {
    redirect("/login?error=configuration");
  }
  if (!authenticated) redirect("/login");
  return <AppShell userEmail={userEmail}><DomainEmailWorkspace /></AppShell>;
}
