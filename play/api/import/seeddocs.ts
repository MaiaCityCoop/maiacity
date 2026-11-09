// The documents kept in the repo as they were first made (./factories.ts, ./gameconfigs.ts, ./skills.ts): each written
// into play's Postgres as the v1 of its Loro document only when play holds none of its id yet. From then on play's
// Postgres is the source of truth: a document changes only by proposal (over MCP), and nothing here writes over it.
import type { Db } from "../src/kit/pg";
import { seedDoc } from "../src/versioned";
import "../src/allkinds";

/** what a seed did: the ids written, those play held already, and those that failed (each with why) */
export type SeedReport = { seeded: string[]; present: string[]; errors: string[] };
/** one document as the repo keeps it: its id, when it was first made, its v1's note, and its content */
export type Seed = { id: string; at: Date; note: string; json: () => unknown };

/** every one of `list`, a document of kind `kind`, written where play holds none of its id yet */
export async function seedDocs(db: Db, kind: string, list: readonly Seed[]): Promise<SeedReport> {
  const out: SeedReport = { seeded: [], present: [], errors: [] };
  for (const s of list) {
    try {
      if (await seedDoc(db, kind, { id: s.id, json: s.json(), note: s.note, at: s.at })) out.seeded.push(s.id);
      else out.present.push(s.id);
    } catch (e) {
      out.errors.push(`${s.id}: ${String((e as Error)?.message ?? e).slice(0, 300)}`);
    }
  }
  return out;
}
