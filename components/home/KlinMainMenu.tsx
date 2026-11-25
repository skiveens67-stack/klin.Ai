"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, Clock3, Coins, FolderKanban,
  Hammer, Sparkles, WalletCards,
} from "lucide-react";

type Project = { id: string; title: string; project_type: string; status: string; updated_at: string };
type Wallet = { balance_gems?: number; currency?: string };
type Job = { id: string; business_name: string; title: string; is_mine?: boolean };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}
function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function KlinMainMenu() {
  const [now, setNow] = useState<Date | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [plan, setPlan] = useState("Loading");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    let active = true;
    Promise.all([
      fetch("/api/projects", { credentials: "same-origin", cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/wallet", { credentials: "same-origin", cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/workforce/jobs", { credentials: "same-origin", cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/dashboard/summary", { credentials: "same-origin", cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([projectData, walletData, jobData, summary]) => {
      if (!active) return;
      setProjects((projectData?.projects ?? []).slice(0, 4));
      setWallet(walletData?.wallet ?? null);
      setJobs((jobData?.jobs ?? []).filter((job: Job) => job.is_mine).slice(0, 4));
      setPlan(summary?.planCode ? String(summary.planCode).replaceAll("_", " ").replace(/\\b\\w/g, (letter: string) => letter.toUpperCase()) : "View plans");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const businessNames = useMemo(() => Array.from(new Set(jobs.map(job => job.business_name).filter(Boolean))), [jobs]);

  return (
    <main className="klin-dashboard klin-welcome-dashboard klin-home-overview">
      <section className="klin-dashboard-welcome klin-welcome-back">
        <div className="klin-dashboard-welcome-copy">
          <div className="klin-eyebrow"><span /> YOUR KLIN WORKSPACE</div>
          <h1>Welcome back.</h1>
          <p>Pick up where you left off. Your projects, work, and business activity are gathered here.</p>
          {now && <div className="klin-home-clock"><Clock3 size={16}/><span>{formatTime(now)} · {formatDate(now)}</span></div>}
        </div>
        <div className="klin-welcome-side" aria-hidden="true">
          <div className="klin-welcome-orbit klin-welcome-orbit-one" />
          <div className="klin-welcome-orbit klin-welcome-orbit-two" />
          <div className="klin-welcome-monogram">K</div>
        </div>
      </section>

      <section className="klin-home-stat-grid">
        <Link href="/wallet" className="klin-home-stat-card">
          <span><Coins size={18}/></span><small>AVAILABLE CREDITS</small>
          <strong>{loading ? "…" : wallet ? (wallet.balance_gems ?? 0).toLocaleString() : "View wallet"}</strong>
          <em>{wallet?.currency ?? "Klin credits"} · Manage wallet</em>
        </Link>
        <Link href="/plans" className="klin-home-stat-card">
          <span><WalletCards size={18}/></span><small>YOUR PLAN</small>
          <strong>{plan}</strong><em>View plan details</em>
        </Link>
      </section>

      <section className="klin-dashboard-section">
        <div className="klin-section-heading">
          <div><span>CONTINUE WORKING</span><h2>Where you left off</h2></div>
          <Link href="/projects">All projects <ArrowUpRight size={14}/></Link>
        </div>
        {projects.length ? (
          <div className="klin-highlight-grid">
            {projects.map(project => (
              <Link href="/projects" className="klin-highlight-card" key={project.id}>
                <div className="klin-highlight-card-top"><span className="klin-highlight-icon"><FolderKanban size={19}/></span><span>{project.project_type.toUpperCase()}</span></div>
                <strong>{project.title}</strong><p>{project.status.replaceAll("_", " ")}</p>
                <span className="klin-highlight-open">Continue <ArrowUpRight size={14}/></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="klin-home-empty"><strong>{loading ? "Loading your work…" : "Your next project starts here."}</strong><p>Start a website, app, or game and it will appear here so you can return to it.</p><Link href="/builder">Create a project <ArrowRight size={15}/></Link></div>
        )}
      </section>

      {businessNames.length > 0 && (
        <section className="klin-dashboard-section klin-business-health">
          <div className="klin-section-heading"><div><span>YOUR BUSINESS</span><h2>How’s your business doing?</h2></div><Link href="/business">Business Exchange <ArrowUpRight size={14}/></Link></div>
          <div className="klin-home-business-card">
            <BriefcaseBusiness size={22}/>
            <div><strong>{businessNames.join(" · ")}</strong><p>You have {jobs.length} active or saved job listing{jobs.length === 1 ? "" : "s"} connected to your business. Open your business workspace to manage activity.</p></div>
            <Link href="/workforce">Manage <ArrowRight size={15}/></Link>
          </div>
        </section>
      )}

      <section className="klin-dashboard-section">
        <div className="klin-section-heading"><div><span>WHAT KLIN CAN HELP BUILD</span><h2>Make something new</h2></div></div>
        <div className="klin-destination-grid">
          <Link href="/builder?type=website" className="klin-destination-card"><Hammer size={19}/><span><strong>Website or app</strong><small>Start a new build with Klin.</small></span><ArrowUpRight size={15}/></Link>
          <Link href="/builder?type=game" className="klin-destination-card"><Sparkles size={19}/><span><strong>Game or project</strong><small>Turn an idea into a project.</small></span><ArrowUpRight size={15}/></Link>
          <Link href="/projects" className="klin-destination-card"><FolderKanban size={19}/><span><strong>Your work</strong><small>Review projects and versions.</small></span><ArrowUpRight size={15}/></Link>
        </div>
      </section>

      <footer className="klin-dashboard-footer">Klin · Your workspace for ideas, projects, and business.</footer>
    </main>
  );
}
