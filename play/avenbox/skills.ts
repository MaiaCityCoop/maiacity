#!/usr/bin/env bun
// The skills mirror (play/SPEC.md §4.14; intent a90151df): play's database is the one source of every skill, and Claude
// Code's Skill tool reads only `.claude/skills`, so each avenBOX session's start writes it from play (never committed).
//
//   bun play/avenbox/skills.ts [--out <dir>]      (.claude/skills at the repository's root by default)
//
// Over play's MCP (PLAY_MCP_URL, PLAY_MCP_TOKEN): one folder a skill (named by its label's slug, only shown), its
// SKILL.md and its references, files held to their hashes. A reference with both or neither of a text and a file, or a
// path leaving its folder, refuses that skill. All is read before the folder is replaced whole. Without a token it
// writes nothing and exits 0 (such a session hands its work over: CLAUDE.md); exits 1 when play can't be read or a
// skill was refused.
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { hashBytes, HASH } from "../api/src/kit/hash";
import { stagedBody } from "../api/src/kit/stages";
import { PLAY_MCP as endpoint, tool } from "./play";

const argv = Bun.argv.slice(2);
const at = argv.indexOf("--out");
const OUT = resolve(at >= 0 && argv[at + 1] ? argv[at + 1] : join(import.meta.dir, "../../.claude/skills"));
const token = process.env.PLAY_MCP_TOKEN;
const say = (s: string) => console.log(`skills: ${s}`);

if (!token) {
  say("no PLAY_MCP_TOKEN: no skills written (play's database is their one source).");
  process.exit(0);
}

/** a file of play's, by its hash, held to it */
async function file(hash: string): Promise<Uint8Array> {
  const r = await fetch(new URL(`/api/files/${hash}`, endpoint), { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`file ${hash}: play answered ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (hashBytes(bytes) !== hash) throw new Error(`file ${hash}: its bytes hash to ${hashBytes(bytes)}`);
  return bytes;
}

const slug = (label: string) => label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "skill";
/** a YAML scalar: plain where it is safe, else double-quoted (JSON's quoting is YAML's) */
const scalar = (s: string) => (/^[A-Za-z0-9][\w .,()/+-]*$/.test(s) && !/: | #/.test(s) ? s : JSON.stringify(s));

/** SKILL.md of skill `s` (its document's json), its folder named `name` */
function skillMd(name: string, id: string, version: number, s: any, uses: string[]): string {
  const fm: string[] = [`name: ${name}`, `description: ${scalar(`${s.description ?? s.note ?? s.label}`.replace(/\s+/g, " ").trim().slice(0, 1024))}`];
  for (const [k, v] of Object.entries(s.frontmatter ?? {})) fm.push(`${k}: ${scalar(Array.isArray(v) ? v.join(" ") : `${v}`)}`);
  const body = `${s.body ?? ""}`.trim() || stagedBody(s, `# ${s.label}`);
  const foot = [`play skill ${id} v${version}, written from play's database (play/avenbox/skills.ts): change it there, by proposal.`];
  if (uses.length) foot.push(`Uses: ${uses.join(", ")}.`);
  return `---\n${fm.join("\n")}\n---\n\n${body}\n\n<!-- ${foot.join(" ")} -->\n`;
}

type Written = { name: string; files: { path: string; data: string | Uint8Array }[] };

async function main() {
  const list = await tool("list_docs", { kind: "skill" });
  const items: { id: string; label: string }[] = Array.isArray(list) ? list : list.items;
  const docs = await Promise.all(items.map((i) => tool("doc_at", { doc: i.id })));
  const names = new Map<string, string>();
  for (const d of docs) {
    let n = slug(d.json.label);
    if ([...names.values()].includes(n)) n = `${n}-${d.id.slice(0, 8)}`;
    names.set(d.id, n);
  }
  const out: Written[] = [];
  const refused: string[] = [];
  for (const d of docs) {
    const s = d.json, name = names.get(d.id)!;
    try {
      const files: Written["files"] = [];
      const seen = new Set(["SKILL.md"]);
      for (const r of s.references ?? []) {
        const hasText = typeof r.text === "string", hasFile = typeof r.file === "string";
        if (hasText === hasFile) throw new Error(`its reference ${r.path} holds ${hasText ? "both a text and a file" : "neither a text nor a file"}`);
        const p = `${r.path ?? ""}`;
        const full = resolve(OUT, name, p);
        if (!p || p.startsWith("/") || p.split("/").some((x) => x === ".." || x === ".") || !full.startsWith(resolve(OUT, name) + sep)) throw new Error(`its reference path ${p} leaves its folder`);
        if (seen.has(p)) throw new Error(`two references at ${p}`);
        seen.add(p);
        if (hasFile && !HASH.test(r.file)) throw new Error(`its reference ${p} names no file hash`);
        files.push({ path: p, data: hasText ? r.text : await file(r.file) });
      }
      const uses = (s.uses ?? []).map((u: string) => (names.has(u) ? names.get(u)! : u));
      files.unshift({ path: "SKILL.md", data: skillMd(name, d.id, d.number ?? d.version, s, uses) });
      out.push({ name, files });
    } catch (e) {
      refused.push(`${s.label} (${d.id}): ${(e as Error).message}`);
    }
  }
  // everything read: the folder replaced whole
  const next = `${OUT}.next`;
  rmSync(next, { recursive: true, force: true });
  for (const w of out) for (const f of w.files) {
    const p = join(next, w.name, f.path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.data);
  }
  mkdirSync(next, { recursive: true });
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  renameSync(next, OUT);
  say(`${out.length} skills written from play to ${OUT}`);
  for (const r of refused) console.error(`skills: refused ${r}`);
  return refused.length ? 1 : 0;
}

if (import.meta.main) {
  try {
    process.exit(await main());
  } catch (e) {
    console.error(`skills: play could not be read, nothing written: ${(e as Error).message}`);
    process.exit(1);
  }
}
