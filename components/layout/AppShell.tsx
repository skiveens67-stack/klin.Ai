"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, Blocks, BookOpen, ChevronDown, CircleHelp, ClipboardCheck, Compass,
  Contact, Cpu, FolderKanban, LogOut, Menu, MessageCircle, Radio, Settings,
  ShieldCheck, Sparkles, Users, WalletCards, X,
} from "lucide-react";

type NavigationItem = { label: string; href?: string; icon: LucideIcon; soon?: boolean };

const navigation: NavigationItem[] = [
  { label: "Klinie Chat", href: "/", icon: MessageCircle },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Marketplace", href: "/marketplace", icon: Compass },
  { label: "Social", href: "/social", icon: Users },
  { label: "Learning", href: "/learning", icon: BookOpen },
  { label: "Wallet", href: "/wallet", icon: WalletCards },
  { label: "Family Hub", href: "/family", icon: ShieldCheck },
  { label: "Devices", href: "/devices", icon: Cpu },
  { label: "Communication Rules", href: "/communications", icon: Radio },
  { label: "Safety Check-ins", href: "/checkins", icon: ClipboardCheck },
  { label: "Trusted Contacts", href: "/trusted-contacts", icon: Contact },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Creative Studio", href: "/creative-studio", icon: Sparkles },
  { label: "Integrations", icon: Blocks, soon: true },
];

export default function AppShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const activeLabel = navigation.find((item) => item.href === pathname)?.label ?? "Klin";
  const signOut = async () => {
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Sign out failed. Please try again.");
      window.location.assign("/login");
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Sign out failed.");
      setSigningOut(false);
    }
  };

  return (
    <div className="app-shell flex h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[#060913] text-slate-100">
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-white/[0.07] bg-[#090F1D] transition-transform lg:relative lg:z-0 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
          <Link href="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3" aria-label="Klin home">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20"><Sparkles size={18} /></div>
            <div><div className="text-base font-bold tracking-wide">Klin<span className="text-cyan-300">.</span></div><div className="text-[10px] tracking-[0.15em] text-slate-500">YOUR AI WORKSPACE</div></div>
          </Link>
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"><X size={18} /></button>
        </div>

        <div className="px-4 pb-3 pt-5"><div className="rounded-xl border border-cyan-300/10 bg-gradient-to-r from-cyan-400/[0.08] to-indigo-500/[0.08] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={14} className="text-cyan-300" /> Personal workspace</div><div className="mt-1 text-[10px] text-slate-500">Your tools, projects and conversations</div></div></div>

        <nav aria-label="Main navigation" className="app-nav min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <div className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = item.href === pathname;
            const classes = `flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs transition ${selected ? "border border-cyan-300/15 bg-cyan-400/[0.09] text-cyan-100" : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`;
            return item.href ? (
              <Link key={item.label} href={item.href} onClick={() => setSidebarOpen(false)} aria-current={selected ? "page" : undefined} className={classes}>
                <Icon size={16} className={selected ? "text-cyan-300" : "text-slate-500"} />
                <span className="flex-1">{item.label}</span>
              </Link>
            ) : (
              <div key={item.label} aria-disabled="true" className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-xs text-slate-600">
                <Icon size={16} className="text-slate-700" /><span className="flex-1">{item.label}</span>
                <span className="rounded-md bg-white/[0.05] px-1.5 py-1 text-[8px] uppercase tracking-wider text-slate-600">Soon</span>
              </div>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/[0.07] p-3">
          <Link href="/settings" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04]"><Settings size={15} /> Settings</Link>
          <a href="https://klin.help" target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04]"><CircleHelp size={15} /> Help &amp; support</a>
          <button onClick={() => void signOut()} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04]"><LogOut size={15} /> {signingOut ? "Signing out…" : "Sign out"}</button>
          {signOutError && <p role="alert" className="px-3 text-[10px] text-rose-300">{signOutError}</p>}
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.035] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold">K</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-200">{userEmail || "Klin account"}</div><div className="text-[10px] text-slate-500">Signed-in workspace</div></div><ChevronDown size={14} className="text-slate-600" /></div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#080D18] px-4 lg:hidden">
          <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><Menu size={18} /></button>
          <span className="text-sm font-semibold">Klin<span className="text-cyan-300">.</span></span>
          <span className="ml-auto text-[10px] text-slate-500">{activeLabel}</span>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
