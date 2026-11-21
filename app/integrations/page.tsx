import AppShell from "@/components/layout/AppShell";
import IntegrationCatalog from "@/components/workspace/IntegrationCatalog";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await requireAuthenticatedUser();
  const aiGatewayConfigured = Boolean((process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) && (process.env.KLINIE_MODEL || process.env.AI_GATEWAY_MODEL));
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  const mediaConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <AppShell userEmail={user.email ?? ""}><IntegrationCatalog aiGatewayConfigured={aiGatewayConfigured} stripeConfigured={stripeConfigured} mediaConfigured={mediaConfigured} /></AppShell>;
}
