import AppShell from "@/components/layout/AppShell";
import WorkforceWorkspace from "@/components/workforce/WorkforceWorkspace";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function WorkforcePage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><WorkforceWorkspace /></AppShell>;
}