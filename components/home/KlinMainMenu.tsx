"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, FlaskConical, FolderKanban,
  Gamepad2, Globe2, Hammer, MessageCircle, Palette, Sparkles,
} from "lucide-react";

const workspaceHighlights = [
  {
    title: "Klinie",
    description: "Your AI chat workspace, with saved conversations and chat history.",
    detail: "CHAT WORKSPACE",
    href: "/chat",
    icon: MessageCircle,
  },
  {
    title: "Xzello",
    description: "A separate creative assistant for ideas, visual direction, and planning.",
    detail: "CREATIVE ASSISTANT",
    href: "/chat/xzello",
    icon: Sparkles,
  },
  {
    title: "Build with Klin",
    description: "Start a website, app, or game project from one workspace.",
    detail: "PROJECT CREATION",
    href: "/builder",
    icon: Hammer,
  },
  {
    title: "Projects and versions",
    description: "Return to saved projects and review your work.",
    detail: "YOUR WORK",
    href: "/projects",
    icon: FolderKanban,
  },
];

const destinations = [
  { title: "Test Lab", description: "Try available features and review project tests.", href: "/testing", icon: FlaskConical },
  { title: "Marketplace", description: "Explore projects and listings.", href: "/marketplace", icon: Globe2 },
  { title: "Creative Studio", description: "Open the creative workspace.", href: "/creative-studio", icon: Palette },
];

export default function KlinMainMenu() {
  return (
    <main className="klin-dashboard klin-welcome-dashboard">
      <section className="klin-dashboard-welcome klin-welcome-back">
        <div className="klin-dashboard-welcome-copy">
          <div className="klin-eyebrow"><span /> YOUR KLIN WORKSPACE</div>
          <h1>Welcome back.</h1>
          <p>Klin and Xzello are here when you are ready to continue. Pick up a conversation, return to a project, or test what is available before the next build.</p>
          <Link href="/testing" className="klin-welcome-cta">Test the workspace <ArrowRight size={16} /></Link>
        </div>
        <div className="klin-welcome-side" aria-hidden="true">
          <div className="klin-welcome-orbit klin-welcome-orbit-one" />
          <div className="klin-welcome-orbit klin-welcome-orbit-two" />
          <div className="klin-welcome-monogram">K</div>
        </div>
      </section>

      <section className="klin-dashboard-section">
        <div className="klin-section-heading">
          <div><span>WORKSPACE HIGHLIGHTS</span><h2>What’s ready to pick up</h2></div>
          <p>Klin + Xzello</p>
        </div>
        <div className="klin-highlight-grid">
          {workspaceHighlights.map(({ title, description, detail, href, icon: Icon }) => (
            <Link href={href} className="klin-highlight-card" key={title}>
              <div className="klin-highlight-card-top">
                <span className="klin-highlight-icon"><Icon size={20} /></span>
                <span>{detail}</span>
              </div>
              <strong>{title}</strong>
              <p>{description}</p>
              <span className="klin-highlight-open">Open <ArrowUpRight size={14} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="klin-test-invite">
        <div className="klin-test-invite-icon"><CheckCircle2 size={21} /></div>
        <div>
          <span>BEFORE THE NEXT BUILD</span>
          <strong>Would you like to test what’s ready?</strong>
          <p>Open Test Lab to try the available workspace features and report anything that needs attention.</p>
        </div>
        <Link href="/testing">Open Test Lab <ArrowRight size={15} /></Link>
      </section>

      <section className="klin-dashboard-section">
        <div className="klin-section-heading">
          <div><span>EXPLORE KLIN</span><h2>Your other destinations</h2></div>
        </div>
        <div className="klin-destination-grid">
          {destinations.map(({ title, description, href, icon: Icon }) => (
            <Link href={href} className="klin-destination-card" key={title}>
              <Icon size={19} />
              <span><strong>{title}</strong><small>{description}</small></span>
              <ArrowUpRight size={15} />
            </Link>
          ))}
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
