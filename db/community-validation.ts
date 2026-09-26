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

export function validateCommunitySlug(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("A slug is required.");
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError("Slug must contain lowercase letters, numbers, and single hyphens.");
  }
  return slug;
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
