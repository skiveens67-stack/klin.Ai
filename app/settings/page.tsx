import { redirect } from "next/navigation";
import Link from "next/link";
import SettingsPanel from "@/components/settings/SettingsPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let email = "";
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login");
    email = user.email ?? "";
  } catch {
    redirect("/login?error=configuration");
  }

  return (
    <div className="settings-shell">
      <header className="settings-topbar"><Link href="/">← Back to Klin</Link><span>Klin<span className="settings-brand-dot">.</span></span></header>
      <SettingsPanel email={email} />
    </div>
  );
}
