// The sandboxes' layouts kept in the repo as they were first made (./sandboxes/: Sandbox 6's village and audit first,
// intent 67f0404a; Sandbox 7's planet, biomes and sites, intent 8d683ad6): each written into play's Postgres as its layout document's v1 (../src/sandboxes.ts) only while the
// sandbox has no layout document yet (play/SPEC.md §4.6: the import writes a sandbox's configs only then). From then on
// play's Postgres is the source of truth: a layout changes only by proposal (over MCP), and nothing here writes over it.
// Run with every deploy, by ./run.ts.
import type { Db } from "../src/pg";
import { SANDBOX } from "../src/ids";
import { ensureLayoutDoc } from "../src/sandboxes";
import audit from "./sandboxes/sandbox-6/audit.json";
import village from "./sandboxes/sandbox-6/village.json";
import planet from "./sandboxes/sandbox-7/planet.json";
import biomes from "./sandboxes/sandbox-7/biomes.json";
import sites from "./sandboxes/sandbox-7/sites.json";

export type SandboxLayoutsReport = { seeded: string[]; present: string[]; errors: string[] };

export const SANDBOX_LAYOUTS: { id: string; configs: Record<string, unknown> }[] = [
  { id: SANDBOX.six, configs: { village, audit } },
  { id: SANDBOX.seven, configs: { planet, biomes, sites } },
];

export async function seedSandboxLayouts(db: Db): Promise<SandboxLayoutsReport> {
  const out: SandboxLayoutsReport = { seeded: [], present: [], errors: [] };
  for (const s of SANDBOX_LAYOUTS) {
    try {
      const made = await db.transaction(async (q) => {
        const { rows } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [`sandbox:${s.id}`]);
        if (rows.length) return false;
        for (const [name, data] of Object.entries(s.configs))
          await q.query(`INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ($1, $2, $3) ON CONFLICT (sandbox_id, name) DO NOTHING`, [s.id, name, data]);
        return ensureLayoutDoc(q, s.id);
      });
      (made ? out.seeded : out.present).push(s.id);
    } catch (e) {
      out.errors.push(`${s.id}: ${String((e as Error)?.message ?? e).slice(0, 300)}`);
    }
  }
  return out;
}
