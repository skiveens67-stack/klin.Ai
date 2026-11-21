export const FREE_AGENT_LIMIT = 30;
export const AGENTS_PER_PAID_PLAN = 10;

export const PAID_PLAN_CODES = new Set(["galaxy", "studio_pro", "ultimate"]);

export type SubscriptionEntitlement = {
  plan_code: string;
  status: string;
};

export function calculateAgentCapacity(subscriptions: SubscriptionEntitlement[]) {
  const activePaidPlans = new Set(
    subscriptions
      .filter((subscription) =>
        subscription.status === "active" &&
        PAID_PLAN_CODES.has(subscription.plan_code),
      )
      .map((subscription) => subscription.plan_code),
  );
  const paidPlanCount = activePaidPlans.size;
  return {
    free_agent_limit: FREE_AGENT_LIMIT,
    active_paid_plan_count: paidPlanCount,
    agents_per_paid_plan: AGENTS_PER_PAID_PLAN,
    max_agents: FREE_AGENT_LIMIT + paidPlanCount * AGENTS_PER_PAID_PLAN,
  };
}
