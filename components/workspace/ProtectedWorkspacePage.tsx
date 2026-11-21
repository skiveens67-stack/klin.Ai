import AppShell from "@/components/layout/AppShell";
import WorkspaceModule, { type ModuleKey } from "@/components/workspace/WorkspaceModule";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export default async function ProtectedWorkspacePage({ module }: { module: ModuleKey }) {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><WorkspaceModule module={module} /></AppShell>;
}
