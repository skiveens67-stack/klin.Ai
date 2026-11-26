"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import OfflineSupport from "@/components/offline/OfflineSupport";
import { usePathname } from "next/navigation";
import {
  Bell, Blocks, BookOpen, Bot, BriefcaseBusiness, CalendarDays, ChevronDown, CircleHelp,
  ClipboardCheck, Compass, Cpu, CreditCard, FolderKanban, Hammer,
  Home, LockKeyhole, LogOut, Menu, MessageCircle, Palette, Radio, Settings, Globe2, Store,
  ShieldCheck, Sparkles, Users, WalletCards, X, FlaskConical, UserRound,
} from "lucide-react";

type Item = { label: string; href: string; icon: LucideIcon };

const primary: Item[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Klinie", href: "/chat", icon: MessageCircle },
  { label: "Xzello", href: "/chat/xzello", icon: Sparkles },
  { label: "Create", href: "/builder", icon: Hammer },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Test Lab", href: "/testing", icon: FlaskConical },
  { label: "Marketplace", href: "/marketplace", icon: Compass },
];

const moreGroups: { title: string; items: Item[] }[] = [
  {
    title: "Explore",
    items: [
      { label: "Business Exchange", href: "/business", icon: BriefcaseBusiness },
      { label: "Klin Hiring", href: "/workforce", icon: Users },
      { label: "Social", href: "/social", icon: Users },
      { label: "Learning", href: "/learning", icon: BookOpen },
    ],
  },
  {
    title: "Workspace tools",
    items: [
      { label: "Creative Studio", href: "/creative-studio", icon: Palette },
      { label: "Domains & email", href: "/domains", icon: Globe2 },
      { label: "Agent capacity", href: "/agents", icon: Bot },
      { label: "Klin Modules", href: "/agents/modules", icon: Blocks },
      { label: "Integrations", href: "/integrations", icon: Blocks },
      { label: "Plans", href: "/plans", icon: CreditCard },
    ],
  },
  {
    title: "Account & safety",
    items: [
      { label: "Account Center", href: "/account", icon: UserRound },
      { label: "Wallet", href: "/wallet", icon: WalletCards },
      { label: "Family Hub", href: "/family", icon: ShieldCheck },
      { label: "Devices", href: "/devices", icon: Cpu },
      { label: "Safety Check-ins", href: "/checkins", icon: ClipboardCheck },
      { label: "Communication Rules", href: "/communications", icon: Radio },
      { label: "Trusted Contacts", href: "/trusted-contacts", icon: Users },
      { label: "Secure Vault", href: "/vault", icon: LockKeyhole },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

const allItems = [...primary, ...moreGroups.flatMap((group) => group.items)];

export default function AppShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [topMoreOpen, setTopMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [accountProfile, setAccountProfile] = useState<{ username: string; account_number: string } | null>(null);
  const activeItem = allItems.find((item) => item.href === pathname) ??
    allItems.find((item) => item.href !== "/" && pathname.startsWith(item.href + "/"));
  const moreIsActive = moreGroups.some((group) =>
    group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/")),
  );

  useEffect(() => {
    if (moreIsActive) setMoreOpen(true);
  }, [moreIsActive]);

  useEffect(() => {
    let active = true;
    fetch("/api/account/profile", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { profile?: { username: string; account_number: string } } : null)
      .then((result) => { if (active && result?.profile) setAccountProfile(result.profile); })
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
    const selected = item.href === "/"
      ? pathname === "/"
      : item.href === "/chat" || item.href === "/chat/xzello"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        aria-current={selected ? "page" : undefined}
        className={"klin-nav-item" + (selected ? " is-active" : "")}
      >
        <Icon size={17} strokeWidth={1.8} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="klin-shell">
      {sidebarOpen && <button aria-label="Close navigation" className="klin-mobile-scrim" onClick={() => setSidebarOpen(false)} />}
      <aside className={"klin-sidebar" + (sidebarOpen ? " is-open" : "")}>
        <div className="klin-sidebar-brand">
          <Link href="/" onClick={() => setSidebarOpen(false)} aria-label="Klin home">
            <img src="/klin-logo.svg" alt="Klin" />
          </Link>
          <button className="klin-icon-button klin-sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="klin-workspace-label"><span className="klin-status-dot" /> YOUR WORKSPACE</div>

        <nav className="klin-sidebar-nav" aria-label="Main navigation">
          <div className="klin-nav-caption">MAIN</div>
          {primary.map(renderItem)}

          <button
            type="button"
            className={"klin-nav-item klin-more-toggle" + (moreIsActive ? " is-active" : "")}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
          >
            <Blocks size={17} strokeWidth={1.8} />
            <span>More tools</span>
            <ChevronDown size={15} className={moreOpen ? "is-rotated" : ""} />
          </button>

          {moreOpen && (
            <div className="klin-more-list">
              {moreGroups.map((group) => (
                <section className="klin-more-group" key={group.title}>
                  <div className="klin-more-group-title">{group.title}</div>
                  {group.items.map(renderItem)}
                </section>
              ))}
            </div>
          )}
        </nav>

        <div className="klin-sidebar-bottom">
          <Link href="/settings" className="klin-nav-item"><Settings size={17} /><span>Settings</span></Link>
          <a href="mailto:support@klin.help?subject=Klin%20Support%20Request" className="klin-nav-item">
            <CircleHelp size={17} /><span>Send support email</span>
          </a>
          <a href="mailto:support@klin.help?subject=Klin%20Product%20Feedback" className="klin-nav-item">
            <MessageCircle size={17} /><span>Send feedback</span>
          </a>
          <a href="mailto:partnerships@klin.help?subject=Klin%20Partnership%20Inquiry&body=Hello%20Klin%20team%2C%0A%0AI%20would%20like%20to%20discuss%20a%20partnership%20with%20Klin.%0A%0AOrganization%3A%0APartnership%20idea%3A%0AContact%20information%3A" className="klin-nav-item">
            <Users size={17} /><span>Partner with Klin</span>
          </a>
          <div className="klin-account-card">
            <div className="klin-account-avatar">{(accountProfile?.username || userEmail || "K").slice(0, 1).toUpperCase()}</div>
            <div className="klin-account-meta">
              <strong>{accountProfile?.username ? "@" + accountProfile.username : userEmail || "Klin account"}</strong>
              <span>{accountProfile?.account_number ? "Klin ID " + accountProfile.account_number : "Signed-in account"}</span>
            </div>
            <button className="klin-icon-button" onClick={() => void signOut()} disabled={signingOut} aria-label="Sign out" title={signingOut ? "Signing out" : "Sign out"}>
              <LogOut size={16} />
            </button>
          </div>
          {signOutError && <p className="klin-shell-error" role="alert">{signOutError}</p>}
        </div>
      </aside>

      <div className="klin-main-column">
        <OfflineSupport />
        <header className="klin-topbar">
          <div className="klin-topbar-left">
            <button aria-label="Open navigation" className="klin-icon-button klin-menu-trigger" onClick={() => setSidebarOpen(true)}>
              <Menu size={19} />
            </button>
            <div className="klin-topbar-heading">
              <span className="klin-topbar-context">KLIN WORKSPACE</span>
              <span className="klin-topbar-title">{pathname === "/chat" ? "Klinie" : pathname.startsWith("/chat/xzello") ? "Xzello" : activeItem?.label ?? "Workspace"}</span>
            </div>
          </div>
          <nav className="klin-topbar-actions" aria-label="Business actions">
            <Link href="/marketplace" className="klin-history-link"><Store size={15} /> Shop</Link>
            <Link href="/business" className="klin-history-link"><BriefcaseBusiness size={15} /> Make a Business</Link>
            <Link href="/social" className="klin-history-link"><MessageCircle size={15} /> Messages</Link>
            <Link href="/meetings" className="klin-history-link"><CalendarDays size={15} /> Meetings</Link>
            <div className="klin-topbar-more">
              <button type="button" className="klin-history-link" aria-expanded={topMoreOpen} onClick={() => setTopMoreOpen((value) => !value)}>
                More <ChevronDown size={14} />
              </button>
              {topMoreOpen && <div className="klin-topbar-more-menu">
                <Link href="/marketplace" onClick={() => setTopMoreOpen(false)}>My marketplace</Link>
                <Link href="/projects" onClick={() => setTopMoreOpen(false)}>My projects</Link>
                <Link href="/workforce" onClick={() => setTopMoreOpen(false)}>Hiring & team</Link>
                <Link href="/wallet" onClick={() => setTopMoreOpen(false)}>Wallet & credits</Link>
                <Link href="/plans" onClick={() => setTopMoreOpen(false)}>Plans & billing</Link>
                <Link href="/integrations" onClick={() => setTopMoreOpen(false)}>Integrations</Link>
                <Link href="/settings" onClick={() => setTopMoreOpen(false)}>Account settings</Link>
                <a href="mailto:support@klin.help?subject=Klin%20Support%20Request">Support</a>
              </div>}
            </div>
          </nav>
        </header>
        <div className="klin-main-content">{children}</div>
      </div>
    </div>
  );
}
