export const AGENT_JOB_STATES = [
  "queued",
  "running",
  "paused",
  "needs_attention",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AgentJobState = typeof AGENT_JOB_STATES[number];

export type AgentJobTransitionOptions = {
  /** Set only after the owner explicitly chooses Continue or Retry. */
  userRequestedResume?: boolean;
};

const TERMINAL_STATES = new Set<AgentJobState>(["completed", "cancelled"]);

const TRANSITIONS: Record<AgentJobState, ReadonlySet<AgentJobState>> = {
  queued: new Set(["running", "cancelled"]),
  running: new Set(["paused", "needs_attention", "completed", "failed", "cancelled"]),
  paused: new Set(["queued", "needs_attention", "cancelled"]),
  needs_attention: new Set(["queued", "cancelled"]),
  completed: new Set(),
  failed: new Set(["queued", "cancelled"]),
  cancelled: new Set(),
};

/**
 * Validate a state change before persisting it.
 * Resuming paused or failed work always requires an explicit user action.
 */
export function canTransitionAgentJob(
  from: AgentJobState,
  to: AgentJobState,
  options: AgentJobTransitionOptions = {},
): boolean {
  if (!AGENT_JOB_STATES.includes(from) || !AGENT_JOB_STATES.includes(to)) return false;
  if (TERMINAL_STATES.has(from)) return false;
  if (!TRANSITIONS[from].has(to)) return false;

  if ((from === "paused" || from === "failed" || from === "needs_attention") && to === "queued") {
    return options.userRequestedResume === true;
  }

  return true;
}

/** Invalid or missing lease timestamps are treated as expired, never as active. */
export function isAgentJobLeaseExpired(
  leaseExpiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (typeof leaseExpiresAt !== "string" || leaseExpiresAt.trim() === "") return true;
  const expiresAt = Date.parse(leaseExpiresAt);
  if (!Number.isFinite(expiresAt)) return true;
  return expiresAt <= now;
}

/**
 * A worker may reclaim queued work, or running work whose lease expired.
 * The caller must still atomically claim the row in the database.
 */
export function isAgentJobReclaimable(
  state: AgentJobState,
  leaseExpiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (state === "queued") return true;
  return state === "running" && isAgentJobLeaseExpired(leaseExpiresAt, now);
}
