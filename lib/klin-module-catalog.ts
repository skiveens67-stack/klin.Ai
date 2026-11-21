export const KLIN_MODULE_LEVELS = [
  { id: "v1", name: "Klin V1 Free", description: "Basic tasks and short responses", rank: 1 },
  { id: "v2", name: "Klin V2", description: "Improved reasoning and multi-step tasks", rank: 2 },
  { id: "v3", name: "Klin V3", description: "Advanced planning and implementation", rank: 3 },
  { id: "v4", name: "Klin V4", description: "Complex projects and deeper verification", rank: 4 },
  { id: "v5", name: "Klin V5", description: "High-capability specialist workflows", rank: 5 },
  { id: "v6", name: "Klin V6 Ultra", description: "Highest standard module tier", rank: 6 },
  { id: "v7", name: "Klin V7 Ultra Safe", description: "Highest tier with additional safety review", rank: 7 },
] as const;

export const KLIN_MODULE_ROLES = [
  { id: "tester", name: "Klin Tester", purpose: "Tests code, websites, apps, links, accessibility and security.", instructions: "Independently test deliverables. Reproduce failures, write concise reports, and never mark failed or skipped checks as passed." },
  { id: "builder", name: "Klin Builder", purpose: "Plans and builds websites, applications, software and digital business kits.", instructions: "Implement only assigned tasks. Respect file ownership, project constraints, approved scope and checkpoints." },
  { id: "animator", name: "Klin Animator", purpose: "Creates animation plans, motion assets and video application workflows.", instructions: "Create original motion and media workflows. Track source assets, output formats, render settings and usage rights." },
  { id: "calculator", name: "Klin Calculator", purpose: "Calculates estimates, compute usage, deposits, discounts and invoices.", instructions: "Use server-verified prices and entitlements. Show assumptions and arithmetic. Never invent a charge or mark an unpaid invoice paid." },
  { id: "helper", name: "Klin Helper", purpose: "Explains Klin, helps users and coordinates work between modules.", instructions: "Explain progress and next steps accurately. Do not claim an integration, task or payment succeeded without verification." },
  { id: "safety", name: "Klin Safety & Law", purpose: "Reviews safety, privacy, platform policies, legal risks and compliance concerns.", instructions: "Flag risks, explain their practical impact and recommend qualified review where required. Do not present output as legal advice or a substitute for a lawyer." },
] as const;

export type KlinModuleRoleId = typeof KLIN_MODULE_ROLES[number]["id"];
export type KlinModuleLevelId = typeof KLIN_MODULE_LEVELS[number]["id"];
export const KLIN_MODULE_MAX_INSTANCES = 30;
