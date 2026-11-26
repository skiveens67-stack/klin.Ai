import AppShell from "@/components/layout/AppShell";
import { requireAuthenticatedUser } from "@/lib/supabase/require-user";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = await requireAuthenticatedUser();
  return (
    <AppShell userEmail={user.email ?? ""}>
      <main className="klin-dashboard" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        <div className="klin-eyebrow"><span /> KLIN BUSINESS</div>
        <h1>Meetings</h1>
        <p>Use meetings for calls with buyers, investors, and partners when you are discussing a sale or business opportunity.</p>
        <section className="klin-home-empty" style={{ marginTop: 24 }}>
          <CalendarDays size={24} />
          <h2>Meeting scheduling is not connected yet.</h2>
          <p>Your meeting space is ready for the next integration step. No calls have been booked or scheduled from Klin yet.</p>
          <Link href="/business">Open Business Exchange</Link>
        </section>
      </main>
    </AppShell>
  );
}
