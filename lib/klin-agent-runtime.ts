import { KLIN_MODULE_LEVELS, KLIN_MODULE_ROLES, type KlinModuleLevelId, type KlinModuleRoleId } from "@/lib/klin-module-catalog";

export function getKlinModuleRuntime(level: KlinModuleLevelId) {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const envName = `KLIN_MODULE_${level.toUpperCase()}_MODEL`;
  const model = process.env[envName] || (level === "v1" ? process.env.KLINIE_MODEL || process.env.AI_GATEWAY_MODEL : undefined);
  if (!apiKey || !model) return null;
  return { apiKey, model, envName };
}

export function getKlinModuleRole(roleId: KlinModuleRoleId) {
  return KLIN_MODULE_ROLES.find((role) => role.id === roleId) ?? null;
}

export function isKlinModuleLevel(value: unknown): value is KlinModuleLevelId {
  return typeof value === "string" && KLIN_MODULE_LEVELS.some((level) => level.id === value);
}

export function isKlinModuleRole(value: unknown): value is KlinModuleRoleId {
  return typeof value === "string" && KLIN_MODULE_ROLES.some((role) => role.id === value);
}
