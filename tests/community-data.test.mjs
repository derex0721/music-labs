import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { createTestD1 } from "./d1-test-db.mjs";
import {
  publishedAtForStatus,
  serializeCommunityPayload,
  createCommunitySlug,
  validateCommunityContentStatus,
  validateCommunityContentType,
  validatePendingSubmissionStatus,
  validateCommunitySlug,
} from "../db/community-validation.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export%20const%20env%20%3D%20%7B%7D", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { onRequestPost: submitCommunity } = await import("../functions/api/community-submissions.ts");

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
  assert.doesNotThrow(() => validatePendingSubmissionStatus(undefined));
  assert.doesNotThrow(() => validatePendingSubmissionStatus("pending"));
  assert.throws(() => validatePendingSubmissionStatus("published"), TypeError);
  assert.throws(() => validatePendingSubmissionStatus("draft"), TypeError);
  const generatedSlug = createCommunitySlug("course", "demo-artist", "音樂寫作課");
  assert.equal(generatedSlug, createCommunitySlug("course", "demo-artist", "音樂寫作課"));
  assert.notEqual(generatedSlug, createCommunitySlug("event", "demo-artist", "音樂寫作課"));
  assert.match(generatedSlug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
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

async function submit(input, binding) {
  return submitCommunity({
    request: new Request("https://music-labs.pages.dev/api/community-submissions", {
      method: "POST",
      headers: { Origin: "https://music-labs.pages.dev", "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    env: { DB: binding },
  });
}

test("course submissions write pending rows and exact retries reuse the same record", async () => {
  const testDb = createTestD1();
  try {
    const input = {
      type: "course",
      creatorId: "demo-artist",
      creatorName: "Demo Artist",
      title: "Intro to Songwriting",
      contactEmail: "artist@example.com",
      shortDescription: "A practical introduction to songwriting.",
      category: "Songwriting",
      level: "Beginner",
      language: "繁體中文",
      format: "Online",
      priceType: "Free",
      externalUrl: "https://example.com/course",
    };
    const first = await submit(input, testDb.binding);
    const firstBody = await first.json();
    assert.equal(first.status, 200);
    assert.equal(firstBody.status, "pending");
    assert.ok(firstBody.id);
    assert.ok(firstBody.slug);

    const retry = await submit(input, testDb.binding);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).id, firstBody.id);

    const row = testDb.database.prepare("SELECT creator_id,type,slug,title,status,payload_json,published_at FROM content_items WHERE type='course'").get();
    assert.equal(row.type, "course");
    assert.equal(row.status, "pending");
    assert.equal(row.published_at, null);
    assert.equal(row.title, input.title);
    assert.equal(JSON.parse(row.payload_json).externalUrl, input.externalUrl);
    assert.equal(JSON.parse(row.payload_json).contactEmail, undefined);
    assert.equal(testDb.database.prepare("SELECT count(*) AS count FROM content_items WHERE type='course'").get().count, 1);
    assert.equal(testDb.database.prepare("SELECT count(*) AS count FROM creators WHERE slug='demo-artist'").get().count, 1);
  } finally {
    testDb.close();
  }
});

test("event and note forms map to their typed payloads, while client status cannot publish", async () => {
  const testDb = createTestD1();
  try {
    const event = {
      type: "event",
      creatorId: "demo-artist",
      creatorName: "Demo Artist",
      title: "Songwriting Meetup",
      contactEmail: "artist@example.com",
      eventType: "Meetup",
      description: "A small online songwriting meetup.",
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      timezone: "Asia/Taipei",
      format: "Online",
      venueName: "",
      city: "",
      country: "",
      externalUrl: "https://example.com/event",
      priceType: "Free",
      currency: "TWD",
    };
    const note = {
      type: "note",
      creatorId: "demo-artist",
      creatorName: "Demo Artist",
      title: "A Songwriting Note",
      contactEmail: "artist@example.com",
      excerpt: "A short note about writing.",
      content: "Keep the first idea that made the song feel alive.",
      tags: ["songwriting", "process"],
    };
    assert.equal((await submit(event, testDb.binding)).status, 200);
    assert.equal((await submit(note, testDb.binding)).status, 200);
    const eventPayload = JSON.parse(testDb.database.prepare("SELECT payload_json FROM content_items WHERE type='event'").get().payload_json);
    const notePayload = JSON.parse(testDb.database.prepare("SELECT payload_json FROM content_items WHERE type='note'").get().payload_json);
    assert.equal(eventPayload.eventType, "Meetup");
    assert.equal(eventPayload.externalUrl, event.externalUrl);
    assert.deepEqual(notePayload.tags, note.tags);
    assert.equal(notePayload.content, note.content);
    assert.equal(testDb.database.prepare("SELECT count(*) AS count FROM content_items WHERE status='pending' AND published_at IS NULL").get().count, 2);

    const rejected = await submit({ ...note, title: "Must Not Publish", status: "published" }, testDb.binding);
    assert.equal(rejected.status, 400);
    assert.equal(testDb.database.prepare("SELECT count(*) AS count FROM content_items WHERE title='Must Not Publish'").get().count, 0);
    const invalid = await submit({ ...note, title: "Invalid Type", type: "lesson" }, testDb.binding);
    assert.equal(invalid.status, 400);
    assert.equal(testDb.database.prepare("SELECT count(*) AS count FROM content_items WHERE title='Invalid Type'").get().count, 0);
  } finally {
    testDb.close();
  }
});
