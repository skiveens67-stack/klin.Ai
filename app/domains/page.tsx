import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DomainEmailWorkspace from "@/components/domains/DomainEmailWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login");
    return <AppShell userEmail={user.email ?? ""}><DomainEmailWorkspace /></AppShell>;
  } catch {
    redirect("/login?error=configuration");
  }
}
