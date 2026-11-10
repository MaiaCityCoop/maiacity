// The legacy sources kept as pieces (intent 5a15e468, step 1): legacy's bundler inlined whole modules into every asset
// that used them, so import/legacy/sources held the same code over and over (13,665,925 bytes, 98 modules in two or
// more sources). Each part two or more sources share is kept once, as a piece file named by the BLAKE3 hash of its
// text, pieces/<hash>.js; a source (or a piece) is its own text with a line `//#piece <hash>` where each piece goes,
// in order. Rebuilt, every source is its text byte for byte, its hash the one index.json names: nothing play holds
// changes (play/api/test/sources.test.ts).
//
// How the parts are found: every source is its lines; the two parts seen next to each other most often, over all the
// sources, are joined into one, again and again (as byte-pair encoding does), until no two parts go together twice. So
// a module two sources share whole is one part, and so is every run of lines two versions of a module share, whatever
// the bundler left out or renamed around it (`SOURCES$1`). Then a part is a piece only where that is smaller than
// keeping its text in each place it goes (a piece is named by a line of 74 bytes), so every piece file is shared.
//
// `bun import/legacy-pieces.ts` (in play/api) cuts the directory again from the sources as they rebuild: it changes
// no source, only how they are kept.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashText } from "../src/kit/hash";
import { pieceFile, rebuild } from "./sources";

// ---- cutting -------------------------------------------------------------------------------------------------------

type Node = { text: string; kids: Node[] | null; hash: string };
const leaf = (text: string): Node => ({ text, kids: null, hash: hashText(text) });
const group = (kids: Node[]): Node => {
  const text = kids.map((k) => k.text).join("");
  return { text, kids, hash: hashText(text) };
};

/** a text's lines, each a part */
const leaves = (text: string): Node[] => text.split(/(?<=\n)/).map(leaf);

/** the parts that go together again and again joined, the pair seen most first (as byte-pair encoding does), so a run
 * of code two sources share is one part however it is cut around it */
function joined(seqs: Node[][]): Node[][] {
  const byHash = new Map<string, Node>();
  for (;;) {
    const count = new Map<string, number>();
    for (const q of seqs) for (let i = 0; i + 1 < q.length; i++) {
      const k = `${q[i].hash}${q[i + 1].hash}`;
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    const top = [...count].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    if (!top.length) return seqs;
    // this round joins the most seen pairs that share no part
    const used = new Set<string>();
    const take = new Set<string>();
    for (const [k] of top) {
      const a = k.slice(0, 64), b = k.slice(64);
      if (used.has(a) || used.has(b)) continue;
      used.add(a);
      used.add(b);
      take.add(k);
      if (take.size >= 256) break;
    }
    seqs = seqs.map((q) => {
      const out: Node[] = [];
      for (let i = 0; i < q.length; i++) {
        if (i + 1 < q.length && take.has(`${q[i].hash}${q[i + 1].hash}`)) {
          const g = group([q[i], q[i + 1]]);
          out.push(byHash.get(g.hash) ?? (byHash.set(g.hash, g), g));
          i++;
        } else out.push(q[i]);
      }
      return out;
    });
  }
}

/** cuts every source into pieces: gives each source's kept text and every piece's kept text by its hash. Which parts
 * are pieces is worked out by what they cost: a piece is kept once and named by a line (74 bytes) wherever it goes, so a
 * part is a piece only where that is smaller than keeping it in each place it goes. */
export function reduce(sources: Map<string, string>): { kept: Map<string, string>; pieces: Map<string, string> } {
  const nodes = new Map<string, Node>();
  const tops = new Map<string, string[]>();
  const seqs: Node[][] = [];
  const names: string[] = [];
  const index = (n: Node): string => {
    if (!nodes.has(n.hash)) nodes.set(n.hash, n);
    n.kids?.forEach(index);
    return n.hash;
  };
  for (const [name, text] of sources) {
    if (/^\/\/#piece /m.test(text)) throw new Error(`${name} holds a line that names a piece`);
    seqs.push(leaves(text));
    names.push(name);
  }
  joined(seqs).forEach((q, i) => tops.set(names[i], q.map(index)));
  const REF = 74;
  // how many times each piece is named, in the sources and in the other pieces
  const refs = (pieces: Set<string>) => {
    const r = new Map<string, number>();
    const walk = (h: string) => {
      for (const { hash: k } of nodes.get(h)!.kids ?? []) {
        if (pieces.has(k)) r.set(k, (r.get(k) ?? 0) + 1);
        else walk(k);
      }
    };
    for (const t of tops.values()) for (const h of t) {
      if (pieces.has(h)) r.set(h, (r.get(h) ?? 0) + 1);
      else walk(h);
    }
    for (const p of pieces) walk(p);
    return r;
  };
  // every part that goes in two places or more starts as a piece; then those that cost more than they save go back
  const pieces = new Set<string>();
  for (const [h, n] of refs(new Set(nodes.keys()))) if (n >= 2) pieces.add(h);
  const size = new Map<string, number>();
  for (let round = 0; round < 50; round++) {
    size.clear();
    const kept = (h: string): number => {
      const got = size.get(h);
      if (got !== undefined) return got;
      const n = nodes.get(h)!;
      const s = n.kids ? n.kids.reduce((a, { hash: k }) => a + (pieces.has(k) ? REF : kept(k)), 0) : Buffer.byteLength(n.text);
      size.set(h, s);
      return s;
    };
    const r = refs(pieces);
    const out = [...pieces].filter((h) => {
      const n = r.get(h) ?? 0;
      return n < 2 || kept(h) * (n - 1) <= REF * n;
    });
    if (!out.length) break;
    // the smallest first: inlining one changes what its parents cost
    out.sort((a, b) => kept(a) - kept(b));
    for (const h of out.slice(0, Math.max(1, Math.ceil(out.length / 2)))) pieces.delete(h);
  }
  const text = (h: string): string => {
    const n = nodes.get(h)!;
    return n.kids ? n.kids.map(({ hash: k }) => (pieces.has(k) ? `//#piece ${k}\n` : text(k))).join("") : n.text;
  };
  const kept = new Map<string, string>();
  for (const [name, t] of tops) kept.set(name, t.map((h) => (pieces.has(h) ? `//#piece ${h}\n` : text(h))).join(""));
  const out = new Map<string, string>();
  for (const p of pieces) out.set(p, text(p));
  return { kept, pieces: out };
}

// ---- the directory -------------------------------------------------------------------------------------------------

if (import.meta.main) {
  const dir = join(import.meta.dir, "legacy/sources");
  const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
  const sources = new Map<string, string>();
  for (const [hash, file] of Object.entries(index.sources as Record<string, string>)) {
    const text = rebuild(dir, readFileSync(join(dir, file), "utf8"));
    if (hashText(text) !== hash) throw new Error(`${file} does not rebuild to ${hash}`);
    sources.set(file, text);
  }
  const { kept, pieces } = reduce(sources);
  rmSync(join(dir, "pieces"), { recursive: true, force: true });
  mkdirSync(join(dir, "pieces"));
  for (const [hash, text] of pieces) writeFileSync(join(dir, pieceFile(hash)), text);
  for (const [file, text] of kept) writeFileSync(join(dir, file), text);
  index.pieces = [...pieces.keys()].sort();
  writeFileSync(join(dir, "index.json"), `${JSON.stringify(sortKeys(index), null, 1)}\n`);
  // every source rebuilds to its hash
  for (const [hash, file] of Object.entries(index.sources as Record<string, string>))
    if (hashText(rebuild(dir, readFileSync(join(dir, file), "utf8"))) !== hash) throw new Error(`${file} does not rebuild`);
  let bytes = 0;
  const walk = (d: string) => {
    for (const f of readdirSync(d)) statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : (bytes += statSync(join(d, f)).size);
  };
  walk(dir);
  console.log(`${sources.size} sources, ${pieces.size} pieces, ${bytes} bytes`);
}

function sortKeys(v: any): any {
  if (Array.isArray(v) || v === null || typeof v !== "object") return v;
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
}
