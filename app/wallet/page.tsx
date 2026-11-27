import AppShell from "@/components/layout/AppShell";
import BillingPortalButton from "@/components/billing/BillingPortalButton";
import PaddleGemStore from "@/components/billing/PaddleGemStore";
import WorkspaceModule from "@/components/workspace/WorkspaceModule";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await requireAuthenticatedUser();
  return (
    <AppShell userEmail={user.email ?? ""}>
      <div className="wallet-page-content">
        <PaddleGemStore clientToken={process.env.next_public_paddle_client_token ?? ""} userEmail={user.email ?? ""} />
        <BillingPortalButton />
        <WorkspaceModule module="wallet" />
      </div>
    </AppShell>
  );
}
