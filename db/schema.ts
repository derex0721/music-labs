import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const COMMUNITY_CONTENT_TYPES = ["work", "course", "event", "note"] as const;
export type CommunityContentType = (typeof COMMUNITY_CONTENT_TYPES)[number];

export const COMMUNITY_CONTENT_STATUSES = ["draft", "pending", "published", "rejected"] as const;
export type CommunityContentStatus = (typeof COMMUNITY_CONTENT_STATUSES)[number];

export const creators = sqliteTable(
  "creators",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_creators_slug").on(table.slug)],
);

export const contentItems = sqliteTable(
  "content_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Legacy Wiki columns remain intact for the existing /api/content consumer.
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    url: text("url").notNull().default(""),
    tags: text("tags").notNull().default(""),
    createdBy: text("created_by").notNull(),

    // Nullable only to preserve pre-existing Wiki rows during the additive migration.
    creatorId: integer("creator_id").references(() => creators.id),
    type: text("type", { enum: COMMUNITY_CONTENT_TYPES }),
    slug: text("slug"),
    status: text("status", { enum: COMMUNITY_CONTENT_STATUSES }).notNull().default("draft"),
    payloadJson: text("payload_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => [
    index("idx_content_items_category_created_at").on(table.category, table.createdAt),
    check(
      "content_items_type_check",
      sql`${table.type} IS NULL OR ${table.type} IN ('work', 'course', 'event', 'note')`,
    ),
    check(
      "content_items_status_check",
      sql`${table.status} IN ('draft', 'pending', 'published', 'rejected')`,
    ),
    check("content_items_slug_check", sql`${table.slug} IS NULL OR length(${table.slug}) > 0`),
    uniqueIndex("idx_content_items_slug").on(table.slug),
    index("idx_content_items_type").on(table.type),
    index("idx_content_items_creator_created_at").on(table.creatorId, table.createdAt),
    index("idx_content_items_status_created_at").on(table.status, table.createdAt),
    index("idx_content_items_status_published_at").on(
      table.status,
      table.publishedAt,
    ),
  ],
);
