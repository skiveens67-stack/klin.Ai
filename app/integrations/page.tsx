import AppShell from "@/components/layout/AppShell";
import IntegrationCatalog from "@/components/workspace/IntegrationCatalog";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><IntegrationCatalog /></AppShell>;
}
