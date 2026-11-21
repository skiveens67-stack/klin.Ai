import AppShell from "@/components/layout/AppShell";
import PricingPlans from "@/components/billing/PricingPlans";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><PricingPlans /></AppShell>;
}
