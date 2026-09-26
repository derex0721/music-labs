import {
  COMMUNITY_CONTENT_STATUSES,
  COMMUNITY_CONTENT_TYPES,
  type CommunityContentStatus,
  type CommunityContentType,
} from "./schema.ts";

export function validateCommunityContentType(value: unknown): CommunityContentType {
  if (typeof value === "string" && COMMUNITY_CONTENT_TYPES.includes(value as CommunityContentType)) {
    return value as CommunityContentType;
  }
  throw new TypeError("Content type must be work, course, event, or note.");
}

export function validateCommunityContentStatus(value: unknown): CommunityContentStatus {
  if (
    typeof value === "string" &&
    COMMUNITY_CONTENT_STATUSES.includes(value as CommunityContentStatus)
  ) {
    return value as CommunityContentStatus;
  }
  throw new TypeError("Content status must be draft, pending, published, or rejected.");
}

export function validatePendingSubmissionStatus(value: unknown): void {
  if (value !== undefined && value !== "pending") {
    throw new TypeError("New submissions must use pending status.");
  }
}

export function validateCommunitySlug(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("A slug is required.");
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError("Slug must contain lowercase letters, numbers, and single hyphens.");
  }
  return slug;
}

export function createCommunitySlug(
  type: CommunityContentType,
  creatorSlug: string,
  title: string,
  discriminator = "",
): string {
  const safeType = validateCommunityContentType(type);
  const safeCreatorSlug = validateCommunitySlug(creatorSlug);
  const safeTitle = title.trim();
  if (!safeTitle) throw new TypeError("A title is required to create a slug.");

  const titlePart = safeTitle
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "content";
  const identity = `${safeCreatorSlug}:${safeType}:${safeTitle}:${discriminator}`;
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return validateCommunitySlug(`${safeType}-${titlePart}-${(hash >>> 0).toString(36)}`);
}

export type CommunityPayload = Record<string, unknown>;

export function serializeCommunityPayload(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Content payload must be a JSON object.");
  }

  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError("Content payload must be JSON serializable.");
  }
  if (!serialized) throw new TypeError("Content payload must be JSON serializable.");
  return serialized;
}

export function publishedAtForStatus(
  status: CommunityContentStatus,
  currentPublishedAt: string | null,
  now: string,
): string | null {
  if (status !== "published") return null;
  return currentPublishedAt || now;
}
