"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, ExternalLink, FlaskConical, RefreshCw } from "lucide-react";

type Project = {
  id: string; project_type: string; title: string; description: string; status: string;
  visibility: string; content_reference: string | null; metadata: Record<string, unknown> | null;
  created_at: string; updated_at: string; published_at: string | null;
};
type Quote = {
  status?: string; estimated_working_days?: number; estimated_active_hours?: number;
  deposit_low_usd?: number; deposit_high_usd?: number;
  estimated_total_low_usd?: number; estimated_total_high_usd?: number;
};
const stages = [
  { keys: ["draft"], title: "Planning" },
  { keys: ["awaiting_deposit"], title: "Awaiting deposit" },
  { keys: ["deposit_paid", "deposit_confirmed"], title: "Deposit confirmed" },
  { keys: ["building", "in_progress"], title: "Build in progress" },
  { keys: ["testing", "qa"], title: "Quality testing" },
  { keys: ["in_review", "review"], title: "Your review" },
  { keys: ["published", "complete"], title: "Published" },
];
function quoteFor(project: Project): Quote | null {
  const value = project.metadata?.builder_quote;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Quote : null;
}
function validHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}
function stageFor(project: Project, quote: Quote | null) {
  const status = String(quote?.status || project.status || "draft").toLowerCase();
  const index = stages.findIndex((stage) => stage.keys.includes(status));
  return { index: index < 0 ? 0 : index, title: index < 0 ? "Recorded status: " + status : stages[index].title };
}
function money(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
    : null;
}
function ProjectCard({ project }: { project: Project }) {
  const quote = quoteFor(project);
  const stage = stageFor(project, quote);
  const stageNumber = stage.index + 1;
  const fill = Math.round((stageNumber / stages.length) * 100);
  const metadata = project.metadata ?? {};
  const previewUrl = validHttpUrl(project.content_reference) || validHttpUrl(metadata.preview_url) || validHttpUrl(metadata.live_url);
  const depositLow = money(quote?.deposit_low_usd);
  const depositHigh = money(quote?.deposit_high_usd);
  const totalLow = money(quote?.estimated_total_low_usd);
  const totalHigh = money(quote?.estimated_total_high_usd);
  return (
    <article className="klin-testing-card">
      <div className="klin-testing-cardtop">
        <div><span>{project.project_type.replaceAll("_", " ").toUpperCase()}</span><h2>{project.title}</h2></div>
        <span className="klin-testing-status">{stage.title}</span>
      </div>
      <div className="klin-testing-progress" role="progressbar" aria-label="Recorded workflow stage" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={stageNumber}>
        <div style={{ width: fill + "%" }} />
      </div>
      <div className="klin-testing-stats">
        <div><span>Recorded stage</span><b>{stageNumber} of {stages.length}</b></div>
        <div><span>Estimated build time</span><b>{typeof quote?.estimated_working_days === "number" ? quote.estimated_working_days + " working day(s)" : "Not estimated"}</b></div>
        <div><span>Deposit before build</span><b>{depositLow && depositHigh ? depositLow + " – " + depositHigh : "No saved quote"}</b></div>
      </div>
      {quote && <p className="klin-testing-sub">
        {totalLow && totalHigh ? "Estimated project total: " + totalLow + " – " + totalHigh + ". " : ""}
        {quote.status === "deposit_paid" ? "Deposit status is recorded as paid." : quote.status === "awaiting_deposit" ? "This quote is waiting for its deposit." : "Quote status: " + (quote.status || "saved") + "."}
        {" "}The deposit is credited toward the final invoice.
      </p>}
      <div className="klin-testing-actions">
        {previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer">Open project to test <ExternalLink size={13} /></a> : <span className="klin-testing-no-preview">No test link attached yet</span>}
        <Link href="/builder">Continue in Builder <ArrowUpRight size={14} /></Link>
        <Link href={"/projects?project=" + encodeURIComponent(project.id)}>Project details <ArrowUpRight size={14} /></Link>
      </div>
    </article>
  );
}
export default function KlinTesting() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const visibleProjects = useMemo(
    () => filter === "all" ? projects : projects.filter((project) => ["website", "app", "game"].includes(project.project_type)),
    [filter, projects]
  );
  const load = useCallback(() => {
    setLoading(true); setError("");
    fetch("/api/projects", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load projects.");
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load projects."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <main className="klin-testing-page">
      <header className="klin-testing-header">
        <div><span>PROJECT QUALITY & PROGRESS</span><h1>Testing</h1><p>Open saved websites and apps to test them. Check each project’s recorded stage, estimated working days, and the deposit shown on its saved quote.</p></div>
        <button type="button" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </header>
      <section className="klin-testing-note"><FlaskConical size={20} /><div><strong>How project progress is tracked</strong><p>Planning → deposit confirmation → build → QA testing → your review → published. The bar shows the latest saved workflow stage. It is not a live timer or an invented progress percentage.</p></div></section>
      <div className="klin-testing-filter" role="group" aria-label="Project filter">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All projects</button>
        <button className={filter === "testable" ? "active" : ""} onClick={() => setFilter("testable")}>Websites, apps & games</button>
      </div>
      {error && <p className="klin-testing-error" role="alert">{error}</p>}
      {loading ? <div className="klin-testing-empty">Loading your projects…</div> :
        visibleProjects.length === 0 ? <div className="klin-testing-empty"><FlaskConical size={24} /><strong>No projects found</strong><p>Create and save a website, app, or other project first. It will appear here for testing and progress tracking.</p><Link href="/builder">Open Builder <ArrowUpRight size={14} /></Link></div> :
          <div className="klin-testing-list">{visibleProjects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>}
      <footer className="klin-testing-foot"><Clock3 size={14} /> Estimated days and deposits come from each saved quote. Actual remaining time and live test results appear only when the build system records them.</footer>
    </main>
  );
}
