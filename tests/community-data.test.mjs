import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  publishedAtForStatus,
  serializeCommunityPayload,
  validateCommunityContentStatus,
  validateCommunityContentType,
  validateCommunitySlug,
} from "../db/community-validation.ts";

function applyMigration(db, path) {
  const migration = readFileSync(new URL(path, import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) db.exec(statement);
  }
}

test("Community values are validated at the repository boundary", () => {
  for (const type of ["work", "course", "event", "note"]) {
    assert.equal(validateCommunityContentType(type), type);
  }
  for (const status of ["draft", "pending", "published", "rejected"]) {
    assert.equal(validateCommunityContentStatus(status), status);
  }
  assert.throws(() => validateCommunityContentType("lesson"), TypeError);
  assert.throws(() => validateCommunityContentStatus("approved"), TypeError);
  assert.equal(validateCommunitySlug("Demo-Artist-1"), "demo-artist-1");
  assert.throws(() => validateCommunitySlug("demo/artist"), TypeError);
  assert.equal(serializeCommunityPayload({ duration: 12 }), '{"duration":12}');
  assert.throws(() => serializeCommunityPayload(["not", "an", "object"]), TypeError);

  const publishedAt = "2026-09-26T12:00:00.000Z";
  assert.equal(publishedAtForStatus("published", null, publishedAt), publishedAt);
  assert.equal(publishedAtForStatus("published", "2026-09-25T12:00:00.000Z", publishedAt), "2026-09-25T12:00:00.000Z");
  assert.equal(publishedAtForStatus("draft", publishedAt, "2026-09-27T12:00:00.000Z"), null);
});

test("D1 migration preserves existing Wiki rows and adds constrained Community columns", () => {
  const db = new DatabaseSync(":memory:");
  try {
    applyMigration(db, "../drizzle/0000_powerful_rocket_racer.sql");
    db.prepare(
      "INSERT INTO content_items (category, title, description, url, tags, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("chord", "Legacy chord", "Existing Wiki row", "https://example.com", "wiki", "admin");

    applyMigration(db, "../drizzle/0001_youthful_scalphunter.sql");

    const legacy = db.prepare(
      "SELECT id, category, title, description, url, tags, created_by, creator_id, type, slug, status, payload_json, created_at, updated_at FROM content_items WHERE title = ?",
    ).get("Legacy chord");
    assert.equal(legacy.category, "chord");
    assert.equal(legacy.description, "Existing Wiki row");
    assert.equal(legacy.status, "draft");
    assert.equal(legacy.payload_json, "{}");
    assert.equal(legacy.creator_id, null);
    assert.equal(legacy.type, null);
    assert.equal(legacy.slug, null);
    assert.ok(legacy.created_at);
    assert.ok(legacy.updated_at);

    const creator = db.prepare(
      "INSERT INTO creators (slug, display_name, status) VALUES (?, ?, ?) RETURNING id",
    ).get("demo-artist", "Demo Artist", "active");
    assert.throws(() => db.prepare(
      "INSERT INTO creators (slug, display_name, status) VALUES ('demo-artist', 'Duplicate Artist', 'active')",
    ).run());
    db.prepare(
      "INSERT INTO content_items (category, title, created_by, creator_id, type, slug) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("community", "Community course", String(creator.id), creator.id, "course", "demo-course");

    assert.throws(() => db.prepare(
      "INSERT INTO content_items (category, title, created_by, creator_id, type, slug) VALUES ('community', 'Bad type', '1', ?, 'lesson', 'bad-type')",
    ).run(creator.id));
    assert.throws(() => db.prepare(
      "INSERT INTO content_items (category, title, created_by, creator_id, type, slug, status) VALUES ('community', 'Bad status', '1', ?, 'work', 'bad-status', 'approved')",
    ).run(creator.id));
    assert.throws(() => db.prepare(
      "INSERT INTO content_items (category, title, created_by, creator_id, type, slug) VALUES ('community', 'Duplicate slug', '1', ?, 'note', 'demo-course')",
    ).run(creator.id));
    assert.throws(() => db.prepare(
      "INSERT INTO content_items (category, title, created_by, creator_id, type, slug) VALUES ('community', 'Orphan', '1', 9999, 'work', 'orphan')",
    ).run());

    const contentId = db.prepare("SELECT id FROM content_items WHERE slug = 'demo-course'").get().id;
    const publish = db.prepare(
      "UPDATE content_items SET status = 'published', published_at = COALESCE(published_at, ?) WHERE id = ?",
    );
    publish.run("2026-09-26T12:00:00.000Z", contentId);
    publish.run("2026-09-27T12:00:00.000Z", contentId);
    assert.equal(
      db.prepare("SELECT published_at FROM content_items WHERE id = ?").get(contentId).published_at,
      "2026-09-26T12:00:00.000Z",
    );
    db.prepare("UPDATE content_items SET status = 'rejected', published_at = NULL WHERE id = ?").run(contentId);
    publish.run("2026-09-27T12:00:00.000Z", contentId);
    assert.equal(
      db.prepare("SELECT published_at FROM content_items WHERE id = ?").get(contentId).published_at,
      "2026-09-27T12:00:00.000Z",
    );

    const indexNames = db.prepare("PRAGMA index_list('content_items')").all().map((index) => index.name);
    for (const name of [
      "idx_content_items_slug",
      "idx_content_items_type",
      "idx_content_items_creator_created_at",
      "idx_content_items_status_created_at",
      "idx_content_items_status_published_at",
    ]) assert.ok(indexNames.includes(name), `missing index ${name}`);
  } finally {
    db.close();
  }
});
