import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

function applyMigration(database, path) {
  const migration = readFileSync(new URL(path, import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) database.exec(statement);
  }
}

export function createTestD1() {
  const database = new DatabaseSync(":memory:");
  applyMigration(database, "../drizzle/0000_powerful_rocket_racer.sql");
  applyMigration(database, "../drizzle/0001_youthful_scalphunter.sql");

  const binding = {
    prepare(query) {
      let parameters = [];
      return {
        bind(...values) {
          parameters = values;
          return this;
        },
        async all() {
          return { results: database.prepare(query).all(...parameters) };
        },
        async raw() {
          return database.prepare(query).all(...parameters).map((row) => Object.values(row));
        },
        async run() {
          const result = database.prepare(query).run(...parameters);
          return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) }, results: [] };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
  return { binding, database, close: () => database.close() };
}
