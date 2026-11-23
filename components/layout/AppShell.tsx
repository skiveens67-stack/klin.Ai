"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import OfflineSupport from "@/components/offline/OfflineSupport";
import { usePathname } from "next/navigation";
import {
  Bell, Blocks, BookOpen, Bot, BriefcaseBusiness, ChevronDown, CircleHelp,
  ClipboardCheck, Compass, Cpu, CreditCard, FolderKanban, Hammer, History,
  Home, LockKeyhole, LogOut, Menu, MessageCircle, Palette, Radio, Settings,
  ShieldCheck, Sparkles, Users, WalletCards, X, FlaskConical, UserRound,
} from "lucide-react";

type Item = { label: string; href: string; icon: LucideIcon };
const primary: Item[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Chat with Klinie", href: "/chat", icon: MessageCircle },
  { label: "Chat with Xzello", href: "/chat/xzello", icon: Sparkles },
  { label: "Create", href: "/builder", icon: Hammer },
  { label: "Testing", href: "/testing", icon: FlaskConical },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Marketplace", href: "/marketplace", icon: Compass },
];
const more: Item[] = [
  { label: "Account Center", href: "/account", icon: UserRound },
  { label: "Shop or Create a Business", href: "/business", icon: BriefcaseBusiness },
  { label: "Social", href: "/social", icon: Users },
  { label: "Learning", href: "/learning", icon: BookOpen },
  { label: "Wallet", href: "/wallet", icon: WalletCards },
  { label: "Agent capacity", href: "/agents", icon: Bot },
  { label: "Klin Modules", href: "/agents/modules", icon: Blocks },
  { label: "Family Hub", href: "/family", icon: ShieldCheck },
  { label: "Creative Studio", href: "/creative-studio", icon: Palette },
  { label: "Integrations", href: "/integrations", icon: Blocks },
  { label: "Devices", href: "/devices", icon: Cpu },
  { label: "Safety Check-ins", href: "/checkins", icon: ClipboardCheck },
  { label: "Communication Rules", href: "/communications", icon: Radio },
  { label: "Trusted Contacts", href: "/trusted-contacts", icon: Users },
  { label: "V7 Secure Vault", href: "/vault", icon: LockKeyhole },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export default function AppShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [accountProfile, setAccountProfile] = useState<{ username: string; account_number: string } | null>(null);
  const activeItem = [...primary, ...more].find((item) => item.href === pathname) ?? [...primary, ...more].find((item) => item.href !== "/" && !["/chat", "/chat/xzello"].includes(item.href) && pathname.startsWith(item.href + "/"));
  const moreIsActive = more.some((item) => pathname === item.href || pathname.startsWith(item.href));

  useEffect(() => {
    if (moreIsActive) setMoreOpen(true);
  }, [moreIsActive]);

  useEffect(() => {
    let active = true;
    fetch("/api/account/profile", { credentials: "same-origin", cache: "no-store" })
      .then(async response => response.ok ? await response.json() as { profile?: { username: string; account_number: string } } : null)
      .then(result => { if (active && result?.profile) setAccountProfile(result.profile); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

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

  const renderItem = (item: Item) => {
    const Icon = item.icon;
    const selected = item.href === "/" ? pathname === "/" : pathname === item.href || (!["/chat", "/chat/xzello"].includes(item.href) && pathname.startsWith(item.href + "/"));
    return <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} aria-current={selected ? "page" : undefined} className={"klin-nav-item" + (selected ? " is-active" : "")}>
      <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
    </Link>;
  };

  return (
    <div className="klin-shell">
      {sidebarOpen && <button aria-label="Close navigation" className="klin-mobile-scrim" onClick={() => setSidebarOpen(false)} />}
      <aside className={"klin-sidebar" + (sidebarOpen ? " is-open" : "")}>
        <div className="klin-sidebar-brand">
          <Link href="/" onClick={() => setSidebarOpen(false)} aria-label="Klin home"><img src="/klin-logo.svg" alt="Klin" /></Link>
          <button className="klin-icon-button klin-sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <div className="klin-workspace-label"><span className="klin-status-dot" /> PERSONAL WORKSPACE</div>
        <nav className="klin-sidebar-nav" aria-label="Main navigation">
          <div className="klin-nav-caption">WORKSPACE</div>
          {primary.map(renderItem)}
          <button type="button" className={"klin-nav-item klin-more-toggle" + (moreIsActive ? " is-active" : "")} aria-expanded={moreOpen} onClick={() => setMoreOpen(value => !value)}>
            <Blocks size={17} strokeWidth={1.8} /><span>More tools</span><ChevronDown size={15} className={moreOpen ? "is-rotated" : ""} />
          </button>
          {moreOpen && <div className="klin-more-list">{more.map(renderItem)}</div>}
        </nav>
        <div className="klin-sidebar-bottom">
          <Link href="/settings" className="klin-nav-item"><Settings size={17} /><span>Settings</span></Link>
          <a href="https://klin.help" target="_blank" rel="noopener noreferrer" className="klin-nav-item"><CircleHelp size={17} /><span>Help & support</span></a>
          <div className="klin-account-card">
            <div className="klin-account-avatar">{(accountProfile?.username || userEmail || "K").slice(0,1).toUpperCase()}</div>
            <div className="klin-account-meta"><strong>{accountProfile?.username ? "@" + accountProfile.username : userEmail || "Klin account"}</strong><span>{accountProfile?.account_number ? "Klin ID " + accountProfile.account_number : "Signed-in account"}</span></div>
            <button className="klin-icon-button" onClick={() => void signOut()} disabled={signingOut} aria-label="Sign out" title={signingOut ? "Signing out" : "Sign out"}><LogOut size={16} /></button>
          </div>
          {signOutError && <p className="klin-shell-error" role="alert">{signOutError}</p>}
        </div>
      </aside>
      <div className="klin-main-column">
        <OfflineSupport />
        <header className="klin-topbar">
          <div className="klin-topbar-left">
            <button aria-label="Open navigation" className="klin-icon-button klin-menu-trigger" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button>
            <span className="klin-topbar-title">{activeItem?.label ?? "Klin workspace"}</span>
          </div>
          <div className="klin-topbar-actions">
            <Link href="/plans" className="klin-plans-link"><CreditCard size={15} /> Plans & Pricing</Link>
            <Link href="/chat" className="klin-history-link"><History size={15} /> Chat history</Link>
          </div>
        </header>
        <div className="klin-main-content">{children}</div>
      </div>
    </div>
  );
}
