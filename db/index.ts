import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

export type CommunityDatabase = NonNullable<typeof env.DB>;

export function getDb(database?: CommunityDatabase) {
  const binding = database ?? env.DB;
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(binding, { schema });
}
