"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Pause, Play, RotateCcw, ShieldCheck, Trash2, Users } from "lucide-react";
import { KLIN_MODULE_LEVELS, KLIN_MODULE_MAX_INSTANCES, KLIN_MODULE_ROLES, type KlinModuleLevelId, type KlinModuleRoleId } from "@/lib/klin-module-catalog";

type ModuleInstance = { id: string; roleId: KlinModuleRoleId; name: string; level: KlinModuleLevelId; enabled: boolean };
type BuildState = "idle" | "running" | "paused";
const STORAGE_KEY = "klin.module-roster.v1";
const BUILD_KEY = "klin.build-session.v1";
const PENDING_RUN_KEY = "klin.pending-module-run.v1";
const PENDING_TEAM_KEY = "klin.pending-module-team.v1";
const initialModules: ModuleInstance[] = KLIN_MODULE_ROLES.map((role, index) => ({ id: role.id, roleId: role.id, name: role.name, level: "v1", enabled: index < 4 }));

export default function KlinModuleManager() {
  const [modules, setModules] = useState<ModuleInstance[]>(initialModules);
  const [ready, setReady] = useState(false);
  const [maxAgents, setMaxAgents] = useState(4);
  const [maxModuleLevel, setMaxModuleLevel] = useState<KlinModuleLevelId>("v1");
  const [buildState, setBuildState] = useState<BuildState>("idle");
  const [notice, setNotice] = useState("");
  const [task, setTask] = useState("");
  const [projectId, setProjectId] = useState("");
  const [teamRunning, setTeamRunning] = useState(false);
  const [pendingTeamRun, setPendingTeamRun] = useState<{ task: string; projectId: string; workerIds: string[] } | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [pendingRun, setPendingRun] = useState<{ moduleId: string; task: string } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const activeCount = useMemo(() => modules.filter((item) => item.enabled).length, [modules]);

  useEffect(() => {
    void fetch("/api/agents/limits", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { max_agents?: number; max_module_level?: KlinModuleLevelId };
        if (Number.isInteger(data.max_agents) && Number(data.max_agents) >= 1) setMaxAgents(Number(data.max_agents));
        if (data.max_module_level && KLIN_MODULE_LEVELS.some((level) => level.id === data.max_module_level)) setMaxModuleLevel(data.max_module_level);
      }).catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ModuleInstance[];
        if (Array.isArray(parsed) && parsed.length <= KLIN_MODULE_MAX_INSTANCES && parsed.every((item) =>
          typeof item.id === "string" && KLIN_MODULE_ROLES.some((role) => role.id === item.roleId) &&
          KLIN_MODULE_LEVELS.some((level) => level.id === item.level) && typeof item.name === "string" &&
          typeof item.enabled === "boolean")) setModules(parsed);
      }
      const state = localStorage.getItem(BUILD_KEY);
      if (state === "paused" || state === "running") setBuildState(state);
      const pending = localStorage.getItem(PENDING_RUN_KEY);
      if (pending) {
        const parsedPending = JSON.parse(pending) as { moduleId?: unknown; task?: unknown };
        if (typeof parsedPending.moduleId === "string" && typeof parsedPending.task === "string") setPendingRun({ moduleId: parsedPending.moduleId, task: parsedPending.task });
      }
    } catch {
      setNotice("Saved local module settings could not be read. Default modules are loaded.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  }, [modules, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(BUILD_KEY, buildState);
  }, [buildState, ready]);

  useEffect(() => {
    if (!ready) return;
    if (pendingRun) localStorage.setItem(PENDING_RUN_KEY, JSON.stringify(pendingRun));
    else localStorage.removeItem(PENDING_RUN_KEY);
  }, [pendingRun, ready]);

  useEffect(() => {
    if (!ready) return;
    if (pendingTeamRun) localStorage.setItem(PENDING_TEAM_KEY, JSON.stringify(pendingTeamRun));
    else localStorage.removeItem(PENDING_TEAM_KEY);
  }, [pendingTeamRun, ready]);

  useEffect(() => {
    const pauseOnDisconnect = () => {
      activeRequest.current?.abort();
      setBuildState("paused");
      setNotice("Connection lost. The active module request was cancelled where possible. Reconnect, then choose Continue to retry the saved task or team.");
    };
    window.addEventListener("offline", pauseOnDisconnect);
    return () => window.removeEventListener("offline", pauseOnDisconnect);
  }, []);

  function cloneModule(source: ModuleInstance) {
    if (modules.length >= KLIN_MODULE_MAX_INSTANCES) {
      setNotice("The local roster reached its 30-module design limit. The active subscription must be checked by the server before real concurrent workers can run.");
      return;
    }
    const role = KLIN_MODULE_ROLES.find((item) => item.id === source.roleId);
    const count = modules.filter((item) => item.roleId === source.roleId).length + 1;
    const canEnable = activeCount < maxAgents;
    setModules((current) => [...current, { ...source, id: crypto.randomUUID(), enabled: canEnable, name: (role?.name ?? source.name) + " " + count }]);
    setNotice("Module copy added to this device's roster. It is a configuration copy, not a separately running worker.");
  }

  function updateModule(id: string, patch: Partial<Pick<ModuleInstance, "name" | "level" | "enabled">>) {
    if (patch.enabled === true && activeCount >= maxAgents) {
      setNotice(`Your verified plan allows up to ${maxAgents} enabled modules. Upgrade your plan or disable another module first.`);
      return;
    }
    setModules((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function runModule(instance: ModuleInstance, requestedTask = task) {
    if (!requestedTask.trim()) {
      setNotice("Enter a task before running a module.");
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    const pending = { moduleId: instance.id, task: requestedTask.trim() };
    setPendingRun(pending);
    try { localStorage.setItem(PENDING_RUN_KEY, JSON.stringify(pending)); } catch { /* Continue with in-memory retry if storage is unavailable. */ }
    setBuildState("running");
    setRunningId(instance.id);
    setNotice("");
    setResults((current) => ({ ...current, [instance.id]: "" }));
    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: instance.roleId, level: instance.level, task: requestedTask.trim() }),
        signal: controller.signal,
      });
      const data = await response.json() as { result?: string; error?: string; model?: string; usage?: { total_tokens?: number } | null };
      if (!response.ok || !data.result) throw new Error(data.error || "Module run failed.");
      setResults((current) => ({ ...current, [instance.id]: data.result! }));
      setPendingRun(null);
      try { localStorage.removeItem(PENDING_RUN_KEY); } catch { /* State is also cleared in memory. */ }
      setBuildState("idle");
      setNotice(`${instance.name} completed one model request using ${data.model ?? instance.level}${data.usage?.total_tokens ? ` · ${data.usage.total_tokens} tokens` : ""}. It did not modify project files.`);
    } catch (caught) {
      if (controller.signal.aborted || !navigator.onLine) {
        setBuildState("paused");
        setNotice("Module request paused. Reconnect and press Continue to retry the saved task.");
      } else {
        setNotice(caught instanceof Error ? caught.message : "Module run failed.");
      }
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setRunningId(null);
    }
  }

  function pauseBuild() {
    activeRequest.current?.abort();
    setBuildState("paused");
    setNotice("Module request cancellation sent. If the connection is unavailable, reconnect and choose Continue to retry the saved task.");
  }

  function continueBuild() {
    if (!navigator.onLine) { setNotice("Klin is still offline. Reconnect before continuing."); return; }
    if (pendingRun) {
      const instance = modules.find((item) => item.id === pendingRun.moduleId);
      if (instance) { void runModule(instance, pendingRun.task); return; }
      setNotice("The saved module was removed. Select a module and submit the task again.");
      return;
    }
    setBuildState("idle");
    setNotice("No interrupted task was saved. Select a module and start a task.");
  }

  return (
    <section className="module-card">
      <div className="module-card-title"><Users size={18} /><h2>Klin Modules · AI worker roster</h2></div>
      <p className="offline-drafts-copy">Each module is a specialist worker profile. Copy a role to create more worker configurations; assign each copy a Klin intelligence level. Model requests run through Klin&apos;s server-side AI Gateway configuration.</p>
      <div className="module-grid">
        {KLIN_MODULE_LEVELS.map((level) => <div className="module-list-item" key={level.id}><ShieldCheck size={16} /><span><strong>{level.name}</strong><small className="block opacity-70">{level.description}</small></span></div>)}
      </div>
      <div className="module-estimate-total"><span>Configured modules</span><strong>{modules.length} / {KLIN_MODULE_MAX_INSTANCES}</strong><span>Enabled profiles: {activeCount} / {maxAgents} plan limit · Up to {maxModuleLevel.toUpperCase()}</span></div>
      <div className="module-field mt-4"><label htmlFor="klin-module-task">Task to send to a module</label><textarea id="klin-module-task" rows={3} maxLength={12000} value={task} onChange={(event) => setTask(event.target.value)} placeholder="Describe the specific task for the selected specialist…" /></div>
      <div className="space-y-3">
        {modules.map((instance) => {
          const role = KLIN_MODULE_ROLES.find((item) => item.id === instance.roleId)!;
          return <article key={instance.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Worker name</label>
                <input aria-label="Worker name" maxLength={60} value={instance.name} onChange={(event) => updateModule(instance.id, { name: event.target.value })} className="w-full rounded-lg border border-white/10 bg-[#080D18] px-3 py-2 text-sm text-white" />
                <p className="mt-2 text-xs text-slate-400">{role.purpose}</p>
              </div>
              <span className={instance.enabled ? "rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200" : "rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400"}>{instance.enabled ? "Enabled profile" : "Disabled profile"}</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div><label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Intelligence level</label>
                <select value={instance.level} onChange={(event) => updateModule(instance.id, { level: event.target.value as KlinModuleLevelId })} className="w-full rounded-lg border border-white/10 bg-[#080D18] px-3 py-2 text-sm text-white">
                  {KLIN_MODULE_LEVELS.map((level) => <option key={level.id} value={level.id} disabled={level.rank > (KLIN_MODULE_LEVELS.find((item) => item.id === maxModuleLevel)?.rank ?? 1)}>{level.name}{level.rank > (KLIN_MODULE_LEVELS.find((item) => item.id === maxModuleLevel)?.rank ?? 1) ? " · Upgrade required" : ""}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => cloneModule(instance)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/20 px-3 py-2 text-xs text-cyan-100"><Copy size={14} /> Copy module</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => updateModule(instance.id, { enabled: !instance.enabled })} className="rounded-lg border border-white/10 px-3 py-2 text-xs">{instance.enabled ? "Disable" : "Enable"}</button>
                {modules.length > KLIN_MODULE_ROLES.length && <button type="button" aria-label={`Delete ${instance.name}`} onClick={() => setModules((current) => current.filter((item) => item.id !== instance.id))} className="rounded-lg border border-rose-300/20 px-3 py-2 text-rose-200"><Trash2 size={14} /></button>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={!instance.enabled || runningId !== null || !task.trim()} onClick={() => void runModule(instance)} className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 disabled:opacity-40">{runningId === instance.id ? "Running module…" : "Run module"}</button></div>
            {results[instance.id] && <div className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-200">{results[instance.id]}</div>}
            <details className="mt-3"><summary className="cursor-pointer text-[11px] text-slate-500">Worker instructions</summary><p className="mt-2 text-xs text-slate-400">{role.instructions}</p></details>
          </article>;
        })}
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-sm">Build pause control</strong><p className="mt-1 text-xs text-slate-400">If offline, cancel the active module request where possible. When back online, press Continue to retry the saved task.</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs">{buildState === "running" ? "Running" : buildState === "paused" ? "Paused" : "Idle"}</span></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={pauseBuild} disabled={buildState === "paused" || buildState === "idle"} className="inline-flex items-center gap-2 rounded-lg border border-amber-300/20 px-3 py-2 text-xs text-amber-100 disabled:opacity-40"><Pause size={14} /> Pause</button>
          <button type="button" onClick={continueBuild} disabled={buildState === "running"} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40"><Play size={14} /> Continue</button>
          <button type="button" onClick={() => { activeRequest.current?.abort(); setPendingRun(null); setBuildState("idle"); setNotice("Local build state reset."); }} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs"><RotateCcw size={14} /> Reset</button>
        </div>
      </div>
      {notice && <p className="mt-3 text-xs text-slate-300" role="status">{notice}</p>}
      <p className="mt-3 text-[10px] text-slate-500">A copied profile is a saved local configuration. The UI reads your verified plan capacity and model-level ceiling. The API enforces the model-level ceiling for each request; server-side concurrent worker enforcement is not connected. Each run currently executes one AI Gateway request. Full autonomous file editing, parallel workers, cloud job snapshots and guaranteed provider-side cancellation are not connected yet.</p>
    </section>
  );
}
