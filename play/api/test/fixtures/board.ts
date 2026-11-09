// A board as play's holds it (intent 2cb70fb8): hundreds of decided intents beside the open ones, each with a note and
// a spec the size of a real one. Seeded straight into play.intents, for ../board.test.ts.
import { COOP } from "../../src/access";
import type { Queryable } from "../../src/kit/pg";
import { newId } from "../../src/kit/uuid";

export const OPEN = ["idea", "specify", "build", "proposal", "ship"] as const;

const NOTE = "Samuel: the board should show this as it is, read as people read it. ".repeat(8).trim();
const SPEC = {
  goal: "Something of play's is made, as its spec says, and nothing else changes.",
  scope: "play/api/src and play/site/src: what this intent names. ".repeat(6).trim(),
  nothing_to_reduce: "A seeded board: nothing to reduce.",
  checks: [1, 2, 3, 4, 5].map((n) => ({
    id: `c${n}`, check: `Check ${n} of this intent holds, as it is stated here in one line.`, how: "test",
    by: "play/api's tests named as this check, against avenBOX's Postgres", run: `cd play/api && bun test -t "check ${n}"`, must: true, step: "mvp",
  })),
};

/**
 * `n` intents at each stage given, by `author`, a minute apart, every tenth sharing its time with the one before (so
 * ties go by id); the decided ones decided then.
 */
export async function seedBoard(db: Queryable, author: string, counts: Partial<Record<string, number>>) {
  const t0 = Date.parse("2026-01-01T00:00:00Z");
  let k = 0;
  for (const [stage, n] of Object.entries(counts)) {
    const rows: unknown[][] = [];
    for (let j = 0; j < (n ?? 0); j++, k++) {
      const at = new Date(t0 + (k % 10 === 9 ? k - 1 : k) * 60_000 + 123).toISOString();
      const closed = stage === "accepted" || stage === "archived";
      const approved = stage === "build" || stage === "proposal" || stage === "ship";
      const spec = approved || closed || stage === "specify" ? JSON.stringify(SPEC) : null;
      rows.push([newId(), stage, `${stage} ${j}: a seeded intent of the board`, at, closed ? at : null, spec, approved ? at : null]);
    }
    for (let i = 0; i < rows.length; i += 200) {
      const part = rows.slice(i, i + 200);
      const p = (r: number, c: number) => `$${r * 7 + c + 4}`;
      const values = part
        .map((_, r) => `(${p(r, 0)}::uuid, $1, 'improve', ${p(r, 2)}, $3, ${p(r, 1)}, $2, 'mcp', ${p(r, 3)}::timestamptz, ${p(r, 4)}::timestamptz, (${p(r, 5)}::text)::jsonb, ${p(r, 6)}::timestamptz)`)
        .join(", ");
      await db.query(`INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via, created, decided_at, spec, approved_at) VALUES ${values}`, [
        COOP, author, NOTE, ...part.flat(),
      ]);
    }
  }
}
