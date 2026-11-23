export type ProjectDraftUpdate = {
  title?: string;
  description?: string;
  visibility?: "private" | "unlisted";
  status?: "draft" | "archived";
};

export type ProjectDraftUpdateResult =
  | { ok: true; value: ProjectDraftUpdate }
  | { ok: false; error: string };

export function parseProjectDraftUpdate(input: unknown): ProjectDraftUpdateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid request body." };
  }

  const record = input as Record<string, unknown>;
  const allowed = new Set(["title", "description", "visibility", "status"]);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    return { ok: false, error: "Unsupported project field." };
  }

  const value: ProjectDraftUpdate = {};
  if ("title" in record) {
    if (typeof record.title !== "string") return { ok: false, error: "Project title must be text." };
    const title = record.title.trim();
    if (title.length < 1 || title.length > 120) {
      return { ok: false, error: "Project title must be 1–120 characters." };
    }
    value.title = title;
  }

  if ("description" in record) {
    if (typeof record.description !== "string") return { ok: false, error: "Project description must be text." };
    const description = record.description.trim();
    if (description.length > 5000) return { ok: false, error: "Project description is too long." };
    value.description = description;
  }

  if ("visibility" in record) {
    if (record.visibility !== "private" && record.visibility !== "unlisted") {
      return { ok: false, error: "Projects can only be set to private or unlisted until publishing moderation is enabled." };
    }
    value.visibility = record.visibility;
  }

  if ("status" in record) {
    if (record.status !== "draft" && record.status !== "archived") {
      return { ok: false, error: "Projects can only be saved as drafts or archived. Publishing is not enabled." };
    }
    value.status = record.status;
  }

  if (Object.keys(value).length === 0) {
    return { ok: false, error: "Provide at least one supported project change." };
  }

  return { ok: true, value };
}
