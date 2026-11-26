import AppShell from "@/components/layout/AppShell";
import KlinTesting from "@/components/testing/KlinTesting";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function TestingPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><KlinTesting /></AppShell>;
}
