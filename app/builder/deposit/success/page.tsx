import AppShell from "@/components/layout/AppShell";
import CheckoutReturn from "@/components/billing/CheckoutReturn";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function BuilderDepositSuccessPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><CheckoutReturn kind="builder_deposit" successful /></AppShell>;
}
