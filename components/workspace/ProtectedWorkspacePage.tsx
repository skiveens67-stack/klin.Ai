import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export default async function ProtectedWorkspacePage({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}>{children}</AppShell>;
}
