import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import KlinModuleManager from "@/components/agents/KlinModuleManager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function KlinModulesPage() {
  let email = "";
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login");
    email = user.email ?? "";
  } catch {
    redirect("/login?error=configuration");
  }
  return <AppShell userEmail={email}><main className="module-page">
    <header className="module-header"><div><div className="module-eyebrow">KLIN INTELLIGENCE SYSTEM</div><h1>Klin Modules</h1><p>Configure specialist workers, duplicate module roles and select a Klin intelligence level.</p></div></header>
    <KlinModuleManager />
  </main></AppShell>;
}
