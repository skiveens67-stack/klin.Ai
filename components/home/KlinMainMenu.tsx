"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, BriefcaseBusiness, Compass, FolderKanban, Globe2, LayoutDashboard, MessageCircle, Smartphone, Sparkles, Store } from "lucide-react";

const destinations = [
  { title: "Create a Website", description: "Describe the website you want. Klin will guide the build.", href: "/builder?type=website", icon: Globe2 },
  { title: "Create an App", description: "Plan and build an app with Klin's builder.", href: "/builder?type=mobile_app", icon: Smartphone },
  { title: "Talk to Klinie", description: "Ask questions, plan ideas, or work through a task.", href: "/chat", icon: MessageCircle },
  { title: "Projects", description: "Continue working on saved websites, apps, and other projects.", href: "/projects", icon: FolderKanban },
];

const quickLinks = [
  ["Marketplace", "/marketplace"], ["Social", "/social"], ["Learning", "/learning"],
  ["Family Hub", "/family"], ["Wallet", "/wallet"], ["Creative Studio", "/creative-studio"],
  ["Klin Modules", "/agents/modules"], ["Notifications", "/notifications"], ["Settings", "/settings"],
] as const;

export default function KlinMainMenu() {
  return (
    <main className="klin-home">
      <header className="klin-home-top">
        <div className="klin-home-brand"><span className="klin-home-mark">K</span><div><strong>Klin</strong><small>Your workspace</small></div></div>
        <Link className="klin-home-top-link" href="/chat"><MessageCircle size={16}/> Open chat <ArrowUpRight size={14}/></Link>
      </header>

      <section className="klin-home-hero">
        <div className="klin-home-eyebrow"><Sparkles size={14}/> YOUR KLIN WORKSPACE</div>
        <h1>What would you like to do?</h1>
        <p>Explore projects made by the community, start a business, build something new, or talk with Klinie.</p>
      </section>

      <section className="klin-home-explore">
        <div className="klin-home-section-heading"><div><span>DISCOVER</span><h2>Try websites and apps</h2><p>Explore public projects made by other Klin creators.</p></div><Link href="/marketplace">Browse marketplace <ArrowUpRight size={14}/></Link></div>
        <div className="klin-home-empty">
          <div className="klin-home-empty-icon"><Compass size={23}/></div>
          <div><strong>Community previews</strong><p>Published websites and apps will appear here so you can open them, test them, and discover what other people have built. Public preview listings are not available yet.</p></div>
          <Link href="/marketplace" className="klin-home-outline">Open Marketplace</Link>
        </div>
      </section>

      <section className="klin-home-business">
        <div><div className="klin-home-eyebrow"><BriefcaseBusiness size={14}/> BUSINESS EXCHANGE</div><h2>Shop or Create a Business</h2><p>Start a business with Klin, or explore businesses and products listed by other creators.</p></div>
        <Link href="/business" className="klin-home-primary">Shop or Create a Business <ArrowUpRight size={16}/></Link>
      </section>

      <section className="klin-home-section">
        <div className="klin-home-section-heading"><div><span>CREATE & WORK</span><h2>Choose where to start</h2></div></div>
        <div className="klin-home-action-grid">
          {destinations.map(({title,description,href,icon:Icon}) => <Link href={href} className="klin-home-action" key={title}><span className="klin-home-action-icon"><Icon size={20}/></span><strong>{title}</strong><p>{description}</p><span className="klin-home-action-arrow"><ArrowUpRight size={16}/></span></Link>)}
        </div>
      </section>

      <section className="klin-home-section klin-home-tools">
        <div className="klin-home-section-heading"><div><span>YOUR KLIN</span><h2>Workspace tools</h2></div></div>
        <div className="klin-home-quick-grid">{quickLinks.map(([label,href])=><Link href={href} key={href}>{label}<ArrowUpRight size={13}/></Link>)}</div>
      </section>
      <footer className="klin-home-footer">Klin · One place to explore, create, and work.</footer>
    </main>
  );
}
