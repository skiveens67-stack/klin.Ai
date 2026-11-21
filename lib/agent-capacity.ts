export const FREE_AGENT_LIMIT = 4;
export const BUILDER_PLAN_LIMITS: Record<string, number> = {
  builder_starter: 10,
  builder_pro: 20,
  builder_business: 30,
};
export const BUILDER_PLAN_MAX_MODULE_LEVEL: Record<string, string> = {
  free: "v1",
  builder_starter: "v3",
  builder_pro: "v5",
  builder_business: "v5",
};
export type SubscriptionEntitlement = { plan_code: string; status: string };

export function calculateAgentCapacity(subscriptions: SubscriptionEntitlement[]) {
  const activePlans = subscriptions
    .filter((subscription) => subscription.status === "active")
    .map((subscription) => subscription.plan_code);
  const activeBuilderPlans = activePlans.filter((plan) => Object.hasOwn(BUILDER_PLAN_LIMITS, plan));
  const selectedPlan = activeBuilderPlans.includes("builder_business")
    ? "builder_business"
    : activeBuilderPlans.includes("builder_pro")
      ? "builder_pro"
      : activeBuilderPlans.includes("builder_starter")
        ? "builder_starter"
        : "free";
  const maxAgents = selectedPlan === "free" ? FREE_AGENT_LIMIT : BUILDER_PLAN_LIMITS[selectedPlan];
  const v6UltraActive = activePlans.includes("klin_v6_ultra");
  return {
    free_agent_limit: FREE_AGENT_LIMIT,
    active_builder_plan: selectedPlan,
    max_agents: maxAgents,
    max_module_level: v6UltraActive ? "v6" : BUILDER_PLAN_MAX_MODULE_LEVEL[selectedPlan],
    v6_ultra_active: v6UltraActive,
    safety_layer: "v7_ultra_safe_always_on",
    agent_runtime: "single_module_request",
    enforcement: "per_request_plan_level_gate",
  };
}
