export const FREE_AGENT_LIMIT = 4;
export const BUILDER_PLAN_LIMITS: Record<string, number> = {
  builder_starter: 10,
  builder_pro: 20,
  builder_business: 30,
};
export type SubscriptionEntitlement = { plan_code: string; status: string };

export function calculateAgentCapacity(subscriptions: SubscriptionEntitlement[]) {
  const activePlans = subscriptions
    .filter((subscription) => subscription.status === "active" && Object.hasOwn(BUILDER_PLAN_LIMITS, subscription.plan_code))
    .map((subscription) => subscription.plan_code);
  const selectedPlan = activePlans.includes("builder_business")
    ? "builder_business"
    : activePlans.includes("builder_pro")
      ? "builder_pro"
      : activePlans.includes("builder_starter")
        ? "builder_starter"
        : "free";
  const maxAgents = selectedPlan === "free" ? FREE_AGENT_LIMIT : BUILDER_PLAN_LIMITS[selectedPlan];
  return {
    free_agent_limit: FREE_AGENT_LIMIT,
    active_builder_plan: selectedPlan,
    max_agents: maxAgents,
    agent_runtime: "not_connected",
    enforcement: "entitlement_preview_only",
  };
}
