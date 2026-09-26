CREATE TABLE `creators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_creators_slug` ON `creators` (`slug`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`creator_id` integer,
	`type` text,
	`slug` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text,
	FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "content_items_type_check" CHECK("__new_content_items"."type" IS NULL OR "__new_content_items"."type" IN ('work', 'course', 'event', 'note')),
	CONSTRAINT "content_items_status_check" CHECK("__new_content_items"."status" IN ('draft', 'pending', 'published', 'rejected')),
	CONSTRAINT "content_items_slug_check" CHECK("__new_content_items"."slug" IS NULL OR length("__new_content_items"."slug") > 0)
);
--> statement-breakpoint
INSERT INTO `__new_content_items`("id", "category", "title", "description", "url", "tags", "created_by", "created_at") SELECT "id", "category", "title", "description", "url", "tags", "created_by", "created_at" FROM `content_items`;--> statement-breakpoint
DROP TABLE `content_items`;--> statement-breakpoint
ALTER TABLE `__new_content_items` RENAME TO `content_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_content_items_category_created_at` ON `content_items` (`category`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_content_items_slug` ON `content_items` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_content_items_type` ON `content_items` (`type`);--> statement-breakpoint
CREATE INDEX `idx_content_items_creator_created_at` ON `content_items` (`creator_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_content_items_status_created_at` ON `content_items` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_content_items_status_published_at` ON `content_items` (`status`,`published_at`);