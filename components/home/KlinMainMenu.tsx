"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, CreditCard, FlaskConical,
  FolderKanban, Globe2, MessageCircle, MonitorSmartphone, Palette, ShoppingBag,
  Smartphone, Sparkles, Store,
} from "lucide-react";

const actions = [
  { title: "Chat with Klinie", description: "Ask questions, plan, learn, and get help.", href: "/chat", icon: MessageCircle, tone: "blue" },
  { title: "Chat with Xzello", description: "Work on branding, design, and creative ideas.", href: "/chat/xzello", icon: Palette, tone: "violet" },
  { title: "Create a Website", description: "Describe your idea and start building.", href: "/builder?type=website", icon: Globe2, tone: "blue" },
  { title: "Create an App", description: "Plan and build an app with Klin.", href: "/builder?type=mobile_app", icon: Smartphone, tone: "violet" },
  { title: "Testing", description: "Preview projects and follow saved build progress.", href: "/testing", icon: FlaskConical, tone: "blue" },
  { title: "My Projects", description: "Open your saved work and continue where you left off.", href: "/projects", icon: FolderKanban, tone: "violet" },
];

export default function KlinMainMenu() {
  return (
    <main className="klin-dashboard">
      <section className="klin-dashboard-welcome">
        <div className="klin-dashboard-welcome-copy">
          <div className="klin-eyebrow"><span /> YOUR WORKSPACE</div>
          <h1>What are we working on?</h1>
          <p>Choose one place to start. Your tools, chats, projects, and plans are organized here.</p>
        </div>
        <img src="/klin-mascot.svg" alt="" className="klin-dashboard-mascot" />
      </section>

      <section className="klin-dashboard-section">
        <div className="klin-section-heading"><div><span>START HERE</span><h2>Your main tools</h2></div><Link href="/chat/history">View chat history <ArrowUpRight size={14} /></Link></div>
        <div className="klin-action-grid">
          {actions.map(({ title, description, href, icon: Icon, tone }) => (
            <Link href={href} className="klin-action-card" key={title}>
              <span className={"klin-action-icon " + tone}><Icon size={20} strokeWidth={1.8} /></span>
              <strong>{title}</strong><p>{description}</p>
              <span className="klin-action-arrow"><ArrowUpRight size={16} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="klin-dashboard-section">
        <div className="klin-section-heading"><div><span>EXPLORE</span><h2>Shop, build, and publish</h2></div></div>
        <div className="klin-explore-grid">
          <Link href="/business" className="klin-explore-card klin-explore-business">
            <span className="klin-action-icon blue"><BriefcaseBusiness size={20} /></span>
            <div><strong>Shop or Create a Business</strong><p>Start a business with Klin or explore businesses listed by others.</p></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/marketplace" className="klin-explore-card">
            <span className="klin-action-icon violet"><ShoppingBag size={20} /></span>
            <div><strong>Marketplace</strong><p>Browse projects, websites, apps, and business listings.</p></div>
            <ArrowRight size={18} />
          </Link>
          <Link href="/social" className="klin-explore-card">
            <span className="klin-action-icon blue"><Store size={20} /></span>
            <div><strong>Community</strong><p>See what other creators are sharing.</p></div>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="klin-plan-banner">
        <div className="klin-plan-banner-icon"><CreditCard size={20} /></div>
        <div><span>PLANS & PAYMENTS</span><strong>See all Klin plans in one place</strong><p>Compare memberships, builder capacity, and which checkouts are currently available.</p></div>
        <Link href="/plans">View payment plans <ArrowUpRight size={15} /></Link>
      </section>

      <section className="klin-coming-row">
        <div className="klin-coming-icon"><MonitorSmartphone size={19} /></div>
        <div><strong>Image and video creation</strong><p>Coming soon. These tools will appear here when they are ready.</p></div>
        <span>COMING SOON</span>
      </section>
      <footer className="klin-dashboard-footer">Klin · One clear place to create, test, and manage your work.</footer>
    </main>
  );
}
