"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, CheckCircle2, FlaskConical,
  FolderKanban, Gamepad2, Globe2, MessageCircle, MonitorSmartphone, Palette,
  ShoppingBag, Sparkles,
} from "lucide-react";

const startActions = [
  {
    title: "Talk with Klinie",
    description: "Ask questions, plan a project, or get help with your next step.",
    href: "/chat",
    icon: MessageCircle,
    tag: "AI ASSISTANT",
  },
  {
    title: "Create something",
    description: "Start a website, app, or game from one clear starting point.",
    href: "/builder",
    icon: Sparkles,
    tag: "BUILD",
  },
  {
    title: "Open your projects",
    description: "Continue saved work and review your previous versions.",
    href: "/projects",
    icon: FolderKanban,
    tag: "YOUR WORK",
  },
];

const workspaceLinks = [
  { title: "Test Lab", description: "Review and test your projects.", href: "/testing", icon: FlaskConical },
  { title: "Marketplace", description: "Explore projects and listings.", href: "/marketplace", icon: ShoppingBag },
  { title: "Business Exchange", description: "Explore or start a business.", href: "/business", icon: BriefcaseBusiness },
  { title: "Klin Social", description: "See what creators are sharing.", href: "/social", icon: Globe2 },
];

export default function KlinMainMenu() {
  return (
    <main className="klin-dashboard">
      <section className="klin-dashboard-welcome">
        <div className="klin-dashboard-welcome-copy">
          <div className="klin-eyebrow"><span /> YOUR WORKSPACE</div>
          <h1>Make room for your next idea.</h1>
          <p>Everything you need to plan, create, test, and manage your work — organized in one place.</p>
          <Link href="/builder" className="klin-welcome-cta">Start creating <ArrowRight size={16} /></Link>
        </div>
        <div className="klin-welcome-side" aria-hidden="true">
          <div className="klin-welcome-orbit klin-welcome-orbit-one" />
          <div className="klin-welcome-orbit klin-welcome-orbit-two" />
          <div className="klin-welcome-monogram">K</div>
        </div>
      </section>

      <section className="klin-dashboard-section klin-start-section">
        <div className="klin-section-heading">
          <div><span>START HERE</span><h2>Choose your next step</h2></div>
          <p>Three simple ways to get moving.</p>
        </div>
        <div className="klin-start-grid">
          {startActions.map(({ title, description, href, icon: Icon, tag }, index) => (
            <Link href={href} className={"klin-start-card klin-start-card-" + index} key={title}>
              <div className="klin-start-card-top">
                <span className="klin-action-icon"><Icon size={21} strokeWidth={1.8} /></span>
                <span className="klin-start-tag">{tag}</span>
              </div>
              <strong>{title}</strong>
              <p>{description}</p>
              <span className="klin-start-card-link">Open <ArrowUpRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="klin-dashboard-section">
        <div className="klin-section-heading">
          <div><span>YOUR WORKSPACE</span><h2>Tools and destinations</h2></div>
          <Link href="/settings">Manage workspace <ArrowUpRight size={14} /></Link>
        </div>
        <div className="klin-workspace-grid">
          {workspaceLinks.map(({ title, description, href, icon: Icon }) => (
            <Link href={href} className="klin-workspace-card" key={title}>
              <span className="klin-workspace-icon"><Icon size={19} strokeWidth={1.8} /></span>
              <span className="klin-workspace-card-copy"><strong>{title}</strong><small>{description}</small></span>
              <ArrowRight size={16} className="klin-workspace-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="klin-dashboard-section klin-tools-section">
        <div className="klin-section-heading">
          <div><span>MORE FROM KLIN</span><h2>Additional tools</h2></div>
        </div>
        <div className="klin-secondary-tools">
          <Link href="/chat/xzello"><Palette size={17} /><span><strong>Chat with Xzello</strong><small>Branding and creative direction</small></span><ArrowUpRight size={14} /></Link>
          <Link href="/learning"><CheckCircle2 size={17} /><span><strong>Learning</strong><small>Build your skills and knowledge</small></span><ArrowUpRight size={14} /></Link>
          <Link href="/creative-studio"><MonitorSmartphone size={17} /><span><strong>Creative Studio</strong><small>Creative workspace tools</small></span><ArrowUpRight size={14} /></Link>
        </div>
      </section>

      <section className="klin-coming-panel">
        <div className="klin-coming-panel-icon"><Gamepad2 size={20} /></div>
        <div className="klin-coming-panel-copy">
          <span>IN DEVELOPMENT</span>
          <strong>Image and video creation</strong>
          <p>These tools are coming soon and will appear in Klin when they are ready.</p>
        </div>
        <span className="klin-coming-pill">COMING SOON</span>
      </section>

      <footer className="klin-dashboard-footer">Klin · Your workspace for ideas, projects, and progress.</footer>
    </main>
  );
}
