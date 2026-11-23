import AppShell from "@/components/layout/AppShell";
import AccountOverview from "@/components/account/AccountOverview";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><AccountOverview email={user.email ?? ""} /></AppShell>;
}
