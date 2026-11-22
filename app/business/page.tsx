import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import BusinessGateway from "@/components/business/BusinessGateway";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  let email = "";
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) redirect("/login");
    email = user.email ?? "";
  } catch {
    redirect("/login?error=configuration");
  }
  return <AppShell userEmail={email}><BusinessGateway /></AppShell>;
}
