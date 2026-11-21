import AppShell from "@/components/layout/AppShell";
import V7Vault from "@/components/security/V7Vault";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function V7VaultPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><V7Vault /></AppShell>;
}
