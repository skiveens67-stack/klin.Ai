import AppShell from "@/components/layout/AppShell";
import MediaLibrary from "@/components/workspace/MediaLibrary";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";

export const dynamic = "force-dynamic";

export default async function CreativeStudioPage() {
  const user = await requireAuthenticatedUser();
  return <AppShell userEmail={user.email ?? ""}><MediaLibrary /></AppShell>;
}
