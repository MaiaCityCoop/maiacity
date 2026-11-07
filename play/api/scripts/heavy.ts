// An intent shaped like the heavy ones on play (intent 2df30a21): 99b612ec (8 pieces in dependency order, some in several
// versions, motion-capture data in them, and 2 assets requiring them) and 873c6ef2 (31 documents, pieces and hosts).
// Used by the detail's size measure (./detail-size.ts), the "accept answers" tests (../test/detailfast.test.ts) and the
// dev server's seed for a look (./seed-heavy.ts). Every document is made the one way play makes them: proposed over the
// same calls MCP's tools make, naming the intent.
import { proposeAsset } from "../src/assetdocs";
import type { BlobStore } from "../src/blobs";
import { meOf } from "../src/access";
import { hashText } from "../src/hash";
import type { Db } from "../src/pg";
import { proposeDocVersion } from "../src/versioned";

const COOP = "12f8d4e7-701f-8727-a327-de9b240ea867";

/** about `kb` KB of motion-capture-like data, as readable lines (a frame a line) */
export function motion(seed: number, kb: number) {
  const lines: string[] = [];
  let x = seed;
  const next = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648).toFixed(4);
  while (lines.join("\n").length < kb * 1024) lines.push(`  [${Array.from({ length: 12 }, next).join(", ")}],`);
  return lines.join("\n");
}

/** a piece's source: requiring those below it, with `kb` KB of data */
export const pieceSource = (label: string, below: string[], kb: number, n = 0) =>
  `// ${label}, a piece (version ${n + 1})\n${below.map((h, i) => `const below${i} = require("${h}");\n`).join("")}module.exports.frames = [\n${motion(label.length * 31 + n, kb)}\n];\nmodule.exports.depth = ${below.length ? `Math.max(${below.map((_, i) => `below${i}.depth`).join(", ")}) + 1` : 1};\n`;

/** a host's source: an asset requiring pieces by hash */
export const hostSource = (label: string, pieces: string[], kb: number) =>
  `// ${label}\n${pieces.map((p, i) => `const p${i} = require("${p}");\n`).join("")}const pose = [\n${motion(label.length * 7, kb)}\n];\nmodule.exports.recipe = function (id, v, variant) {\n  return { meta: { id, v, variant }, build() { return pose.length + ${pieces.length ? "p0.depth" : "0"}; } };\n};\n`;

/** an intent in Build, its spec approved and its one must check passed: what takes work */
export async function building(db: Db, author: string, title: string) {
  const id = crypto.randomUUID();
  const spec = { goal: "It changes.", scope: "A heavy intent.", checks: [{ id: "c1", check: "It holds", how: "test", by: "true", run: "true", must: true, step: "mvp" }] };
  const results = { c1: { pass: true, evidence: "exit 0", by: null, at: new Date().toISOString() } };
  await db.query(
    `INSERT INTO play.intents (id, coop_id, kind, title, stage, author, via, spec, results, approved_by, approved_at) VALUES ($1, $2, 'improve', $3, 'build', $4, 'mcp', ($5::text)::jsonb, ($6::text)::jsonb, $4, now())`,
    [id, COOP, title, author, JSON.stringify(spec), JSON.stringify(results)],
  );
  return id;
}

export type Heavy = { intent: string; pieces: { doc: string; label: string; hashes: string[] }[]; hosts: { asset: string; label: string; version: string }[] };

/**
 * Proposes into intent `intent`: `pieces` pieces in dependency order (each on the one or two below it, at most 3
 * deep), each of the first `versions` of them in two versions, each with `kb` KB of data, then `hosts` assets requiring
 * the top ones. Once every must passes it is at Proposal, waiting.
 */
export async function heavy(db: Db, store: BlobStore, author: string, o: { title: string; pieces: number; versions: number; hosts: number; kb: number; labels?: string[]; hostLabels?: string[] }): Promise<Heavy> {
  const ctx = { db, store };
  const me = () => meOf(db, author);
  const intent = await building(db, author, o.title);
  const out: Heavy = { intent, pieces: [], hosts: [] };
  // layers: a piece's depth is 1 + the deepest it requires; MOST_DEEP is 4 with the host, so pieces go 3 deep
  const depth: number[] = [];
  for (let i = 0; i < o.pieces; i++) {
    const label = o.labels?.[i] ?? `Piece ${i + 1}`;
    const d = i % 3; // 0, 1, 2: a piece on layer d requires one of the layer below
    const below = d === 0 ? [] : [out.pieces[i - 1].hashes.at(-1)!];
    depth.push(d + 1);
    const src = pieceSource(label, below, o.kb);
    const p = await proposeDocVersion(ctx, await me(), { kind: "piece", whole: { schema: "piece/1", label, source: src }, note: `${label}, a piece`, intent });
    const entry = { doc: p.doc as string, label, hashes: [hashText(src)] };
    if (i < o.versions) {
      const src2 = pieceSource(label, below, o.kb, 1);
      await proposeDocVersion(ctx, await me(), { doc: entry.doc, edits: [{ op: "set", path: ["source"], value: src2 }], note: `${label} v2`, intent });
      entry.hashes.push(hashText(src2));
    }
    out.pieces.push(entry);
  }
  // the hosts require the pieces at the top of their layers (depth 3, or the deepest there is)
  const tops = out.pieces.filter((_, i) => i % 3 === 2 || i === out.pieces.length - 1);
  for (let h = 0; h < o.hosts; h++) {
    const label = o.hostLabels?.[h] ?? `Host ${h + 1}`;
    const req = [tops[h % tops.length].hashes.at(-1)!];
    const a = await proposeAsset(db, store, await me(), { card: { lod: { levels: "derived" } }, new: { group: "actors", label }, note: `${label}, a host`, source: hostSource(label, req, o.kb), intent });
    out.hosts.push({ asset: a.asset, label, version: a.version });
  }
  return out;
}
