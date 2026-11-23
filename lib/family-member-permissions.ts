export const FAMILY_MEMBER_ROLES = ["administrator", "parent_guardian", "member", "child"] as const;
export const FAMILY_PERMISSION_KEYS = [
  "can_chat",
  "can_create_projects",
  "can_publish_projects",
  "can_use_marketplace",
  "can_manage_devices",
  "can_view_learning",
] as const;

export type FamilyMemberRole = typeof FAMILY_MEMBER_ROLES[number];
export type FamilyMemberPermissions = Partial<Record<typeof FAMILY_PERMISSION_KEYS[number], boolean>>;

export function validateFamilyMemberUpdate(value: unknown):
  | { ok: true; role?: FamilyMemberRole; permissions?: FamilyMemberPermissions }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid family member update." };
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "role" && key !== "permissions")) {
    return { ok: false, error: "Unexpected family member field." };
  }
  if (Object.keys(input).length === 0) {
    return { ok: false, error: "Provide a role or permissions update." };
  }

  let role: FamilyMemberRole | undefined;
  if (input.role !== undefined) {
    if (typeof input.role !== "string" || !FAMILY_MEMBER_ROLES.includes(input.role as FamilyMemberRole)) {
      return { ok: false, error: "Choose a supported family member role." };
    }
    role = input.role as FamilyMemberRole;
  }

  let permissions: FamilyMemberPermissions | undefined;
  if (input.permissions !== undefined) {
    if (!input.permissions || typeof input.permissions !== "object" || Array.isArray(input.permissions)) {
      return { ok: false, error: "Permissions must be an object of boolean values." };
    }
    const entries = Object.entries(input.permissions as Record<string, unknown>);
    if (entries.length === 0 || entries.some(([key, enabled]) =>
      !FAMILY_PERMISSION_KEYS.includes(key as typeof FAMILY_PERMISSION_KEYS[number]) || typeof enabled !== "boolean")) {
      return { ok: false, error: "Permissions contain an unsupported key or non-boolean value." };
    }
    permissions = Object.fromEntries(entries) as FamilyMemberPermissions;
  }
  return { ok: true, ...(role ? { role } : {}), ...(permissions ? { permissions } : {}) };
}
