import AppShell from "@/components/layout/AppShell";
import BillingPortalButton from "@/components/billing/BillingPortalButton";
import WorkspaceModule from "@/components/workspace/WorkspaceModule";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await requireAuthenticatedUser();
  return (
    <AppShell userEmail={user.email ?? ""}>
      <div className="wallet-page-content">
        <BillingPortalButton />
        <WorkspaceModule module="wallet" />
      </div>
    </AppShell>
  );
}
