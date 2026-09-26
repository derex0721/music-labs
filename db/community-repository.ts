import { and, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "./index";
import { contentItems, creators, type CommunityContentStatus, type CommunityContentType } from "./schema";
import {
  publishedAtForStatus,
  serializeCommunityPayload,
  validateCommunityContentStatus,
  validateCommunityContentType,
  validateCommunitySlug,
  type CommunityPayload,
} from "./community-validation";

export type Creator = typeof creators.$inferSelect;

export interface CommunityContentItem {
  id: number;
  creatorId: number;
  type: CommunityContentType;
  slug: string;
  title: string;
  status: CommunityContentStatus;
  payload: CommunityPayload;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateCreatorInput {
  slug: string;
  displayName: string;
  status: string;
}

export interface CreateContentItemInput {
  creatorId: number;
  type: CommunityContentType;
  slug: string;
  title: string;
  payload: CommunityPayload;
  status?: CommunityContentStatus;
}

export interface ContentListOptions {
  type?: CommunityContentType;
  status?: CommunityContentStatus;
  limit?: number;
  offset?: number;
}

export interface PublishedContentOptions {
  type?: CommunityContentType;
  creatorId?: number;
  limit?: number;
  offset?: number;
}

type ContentRow = typeof contentItems.$inferSelect;

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function positiveId(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function pagination(options: { limit?: number; offset?: number }) {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError("Limit must be an integer between 1 and 100.");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new TypeError("Offset must be a non-negative integer.");
  }
  return { limit, offset };
}

function mapContentRow(row: ContentRow | undefined): CommunityContentItem | null {
  if (!row || row.creatorId === null || row.type === null || row.slug === null) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(row.payloadJson);
  } catch {
    throw new Error(`Content item ${row.id} has invalid payload JSON.`);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Content item ${row.id} payload must be a JSON object.`);
  }

  return {
    id: row.id,
    creatorId: row.creatorId,
    type: validateCommunityContentType(row.type),
    slug: validateCommunitySlug(row.slug),
    title: row.title,
    status: validateCommunityContentStatus(row.status),
    payload: payload as CommunityPayload,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

function communityRowConditions(): SQL[] {
  return [isNotNull(contentItems.creatorId), isNotNull(contentItems.type), isNotNull(contentItems.slug)];
}

export async function createCreator(input: CreateCreatorInput): Promise<Creator> {
  const slug = validateCommunitySlug(input.slug);
  const displayName = requiredText(input.displayName, "Display name");
  const status = requiredText(input.status, "Creator status");
  const now = new Date().toISOString();
  const [creator] = await getDb()
    .insert(creators)
    .values({ slug, displayName, status, createdAt: now, updatedAt: now })
    .returning();
  return creator;
}

export async function getCreatorById(creatorId: number): Promise<Creator | null> {
  const [creator] = await getDb()
    .select()
    .from(creators)
    .where(eq(creators.id, positiveId(creatorId, "Creator id")))
    .limit(1);
  return creator ?? null;
}

export async function getCreatorBySlug(slug: string): Promise<Creator | null> {
  const [creator] = await getDb()
    .select()
    .from(creators)
    .where(eq(creators.slug, validateCommunitySlug(slug)))
    .limit(1);
  return creator ?? null;
}

export async function updateCreatorStatus(creatorId: number, status: string): Promise<Creator | null> {
  const now = new Date().toISOString();
  const [creator] = await getDb()
    .update(creators)
    .set({ status: requiredText(status, "Creator status"), updatedAt: now })
    .where(eq(creators.id, positiveId(creatorId, "Creator id")))
    .returning();
  return creator ?? null;
}

export async function createContentItem(input: CreateContentItemInput): Promise<CommunityContentItem> {
  const creatorId = positiveId(input.creatorId, "Creator id");
  const type = validateCommunityContentType(input.type);
  const status = validateCommunityContentStatus(input.status ?? "draft");
  const slug = validateCommunitySlug(input.slug);
  const title = requiredText(input.title, "Content title");
  const payloadJson = serializeCommunityPayload(input.payload);
  const now = new Date().toISOString();
  const [row] = await getDb()
    .insert(contentItems)
    .values({
      creatorId,
      type,
      slug,
      title,
      status,
      payloadJson,
      createdAt: now,
      updatedAt: now,
      publishedAt: publishedAtForStatus(status, null, now),
      // Existing Wiki columns stay populated for compatibility with the shared table.
      category: "community",
      description: "",
      url: "",
      tags: "",
      createdBy: String(creatorId),
    })
    .returning();
  const item = mapContentRow(row);
  if (!item) throw new Error("Database returned an incomplete Community content item.");
  return item;
}

export async function getContentItemById(contentId: number): Promise<CommunityContentItem | null> {
  const [row] = await getDb()
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.id, positiveId(contentId, "Content item id")), ...communityRowConditions()))
    .limit(1);
  return mapContentRow(row);
}

export async function getContentItemBySlug(slug: string): Promise<CommunityContentItem | null> {
  const [row] = await getDb()
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.slug, validateCommunitySlug(slug)), ...communityRowConditions()))
    .limit(1);
  return mapContentRow(row);
}

export async function listContentByCreator(
  creatorId: number,
  options: ContentListOptions = {},
): Promise<CommunityContentItem[]> {
  const { limit, offset } = pagination(options);
  const conditions: SQL[] = [
    eq(contentItems.creatorId, positiveId(creatorId, "Creator id")),
    ...communityRowConditions(),
  ];
  if (options.type !== undefined) conditions.push(eq(contentItems.type, validateCommunityContentType(options.type)));
  if (options.status !== undefined) {
    conditions.push(eq(contentItems.status, validateCommunityContentStatus(options.status)));
  }
  const rows = await getDb()
    .select()
    .from(contentItems)
    .where(and(...conditions))
    .orderBy(desc(contentItems.createdAt), desc(contentItems.id))
    .limit(limit)
    .offset(offset);
  return rows.map(mapContentRow).filter((item): item is CommunityContentItem => item !== null);
}

export async function listContentByStatus(
  status: CommunityContentStatus,
  options: Omit<ContentListOptions, "status"> = {},
): Promise<CommunityContentItem[]> {
  const { limit, offset } = pagination(options);
  const conditions: SQL[] = [
    eq(contentItems.status, validateCommunityContentStatus(status)),
    ...communityRowConditions(),
  ];
  if (options.type !== undefined) conditions.push(eq(contentItems.type, validateCommunityContentType(options.type)));
  const rows = await getDb()
    .select()
    .from(contentItems)
    .where(and(...conditions))
    .orderBy(desc(contentItems.createdAt), desc(contentItems.id))
    .limit(limit)
    .offset(offset);
  return rows.map(mapContentRow).filter((item): item is CommunityContentItem => item !== null);
}

export async function updateContentStatus(
  contentId: number,
  status: CommunityContentStatus,
): Promise<CommunityContentItem | null> {
  const checkedStatus = validateCommunityContentStatus(status);
  const now = new Date().toISOString();
  const [row] = await getDb()
    .update(contentItems)
    .set({
      status: checkedStatus,
      updatedAt: now,
      publishedAt: checkedStatus === "published" ? sql`COALESCE(${contentItems.publishedAt}, ${now})` : null,
    })
    .where(and(eq(contentItems.id, positiveId(contentId, "Content item id")), ...communityRowConditions()))
    .returning();
  return mapContentRow(row);
}

export async function listPublishedContent(
  options: PublishedContentOptions = {},
): Promise<CommunityContentItem[]> {
  const { limit, offset } = pagination(options);
  const conditions: SQL[] = [
    eq(contentItems.status, "published"),
    isNotNull(contentItems.publishedAt),
    ...communityRowConditions(),
  ];
  if (options.type !== undefined) conditions.push(eq(contentItems.type, validateCommunityContentType(options.type)));
  if (options.creatorId !== undefined) {
    conditions.push(eq(contentItems.creatorId, positiveId(options.creatorId, "Creator id")));
  }
  const rows = await getDb()
    .select()
    .from(contentItems)
    .where(and(...conditions))
    .orderBy(desc(contentItems.publishedAt), desc(contentItems.id))
    .limit(limit)
    .offset(offset);
  return rows.map(mapContentRow).filter((item): item is CommunityContentItem => item !== null);
}
