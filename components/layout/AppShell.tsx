"use client";

import { useState } from "react";
import {
  Blocks, ChevronDown, CircleHelp, Compass, FolderKanban, Home,
  LogOut, Menu, MessageCircle, Settings, ShieldCheck, Sparkles, X,
} from "lucide-react";
import KlinieChat from "@/components/chat/KlinieChat";

const navigation = [
  { label: "Overview", icon: Home, status: "soon" },
  { label: "Klinie Chat", icon: MessageCircle, status: "active" },
  { label: "Projects", icon: FolderKanban, status: "soon" },
  { label: "Creative Studio", icon: Sparkles, status: "soon" },
  { label: "Marketplace", icon: Compass, status: "soon" },
  { label: "Integrations", icon: Blocks, status: "soon" },
];

export default function AppShell({ userEmail }: { userEmail: string }) {
  const [active, setActive] = useState("Klinie Chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);\n  const [signingOut, setSigningOut] = useState(false);\n  const [signOutError, setSignOutError] = useState("");\n\n  const signOut = async () => {\n    setSigningOut(true);\n    setSignOutError("");\n    try {\n      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });\n      if (!response.ok) throw new Error("Sign out failed. Please try again.");\n      window.location.assign("/login");\n    } catch (error) {\n      setSignOutError(error instanceof Error ? error.message : "Sign out failed.");\n      setSigningOut(false);\n    }\n  };

  return (
    <div className="flex h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[#060913] text-slate-100">
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-white/[0.07] bg-[#090F1D] transition-transform lg:relative lg:z-0 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-500/20"><Sparkles size={18} /></div>
            <div><div className="text-base font-bold tracking-wide">Klin<span className="text-cyan-300">.</span></div><div className="text-[10px] tracking-[0.15em] text-slate-500">YOUR AI WORKSPACE</div></div>
          </div>
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"><X size={18} /></button>
        </div>

        <div className="px-4 pb-3 pt-5"><div className="rounded-xl border border-cyan-300/10 bg-gradient-to-r from-cyan-400/[0.08] to-indigo-500/[0.08] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={14} className="text-cyan-300" /> Personal workspace</div><div className="mt-1 text-[10px] text-slate-500">Your tools, projects and conversations</div></div></div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-2">
          <div className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const selected = active === item.label;
            return <button key={item.label} onClick={() => { setActive(item.label); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition ${selected ? "border border-cyan-300/15 bg-cyan-400/[0.09] text-cyan-100" : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}>
              <Icon size={16} className={selected ? "text-cyan-300" : "text-slate-500"} />
              <span className="flex-1">{item.label}</span>
              {item.status === "soon" && <span className="rounded-md bg-white/[0.05] px-1.5 py-1 text-[8px] uppercase tracking-wider text-slate-600">Soon</span>}
            </button>;
          })}
        </nav>

        <div className="space-y-1 border-t border-white/[0.07] p-3">\n          <button onClick={() => void signOut()} disabled={signingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04]"><LogOut size={15} /> {signingOut ? "Signing out…" : "Sign out"}</button>\n          {signOutError && <p role="alert" className="px-3 text-[10px] text-rose-300">{signOutError}</p>}
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04]"><Settings size={15} /> Settings</button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.04]"><CircleHelp size={15} /> Help & support</button>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.035] p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold">K</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-200">{userEmail || "Klin account"}</div><div className="text-[10px] text-slate-500">Signed-in workspace</div></div><ChevronDown size={14} className="text-slate-600" /></div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#080D18] px-4 lg:hidden">
          <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><Menu size={18} /></button>
          <span className="text-sm font-semibold">Klin<span className="text-cyan-300">.</span></span>
          <span className="ml-auto text-[10px] text-slate-500">{active}</span>
        </header>
        <div className="min-h-0 flex-1">
          {active === "Klinie Chat" ? <KlinieChat /> : (
            <main className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06]"><Sparkles size={24} className="text-cyan-200" /></div>
              <h1 className="text-xl font-semibold">{active}</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">This workspace area is not connected yet. It is shown as coming soon rather than pretending the feature is ready.</p>
              <button onClick={() => setActive("Klinie Chat")} className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2.5 text-xs font-medium text-cyan-100 hover:bg-cyan-300/[0.12]">Return to Klinie Chat</button>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
