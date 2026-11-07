#!/usr/bin/env bun
// The skills mirror (play/SPEC.md §4.14; intent a90151df): play's database is the one source of every skill, and Claude
// Code's Skill tool reads only `.claude/skills`, so each avenBOX session's start writes it from play
// (.claude/settings.json, after up.sh). Never committed (.gitignore): no second source to drift.
//
//   bun play/avenbox/skills.ts [--out <dir>]      (.claude/skills at the repository's root by default)
//
// It reads every skill over play's MCP (list_docs kind skill, doc_at; PLAY_MCP_URL, play.maia.city's by default,
// PLAY_MCP_TOKEN its Bearer) and writes one folder a skill, named by its label's slug (only shown: a skill is named by
// its UUID): SKILL.md, its frontmatter `name`, `description` and the skill's `frontmatter` as it came (allowed-tools
// space-separated), then its `body` (avenMAIA's and Intents' `system` and `stages`, which have none); and each
// reference at its path, a text as it is, a file fetched by its hash from play's files and held to it. A reference
// holding both a text and a file, or neither, or a path leaving its folder, is refused, and that skill is not written.
// Everything is read before anything is written; then the folder is replaced whole. Without PLAY_MCP_TOKEN it writes
// nothing and exits 0 (such a session hands its work over: CLAUDE.md). It exits 1 when play can't be read or a skill
// was refused.
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { hashBytes, HASH } from "../api/src/hash";

const argv = Bun.argv.slice(2);
const at = argv.indexOf("--out");
const OUT = resolve(at >= 0 && argv[at + 1] ? argv[at + 1] : join(import.meta.dir, "../../.claude/skills"));
const endpoint = process.env.PLAY_MCP_URL || "https://play.maia.city/api/mcp";
const token = process.env.PLAY_MCP_TOKEN;
/** an intent's stages in their order (play/api/src/skills.ts SKILL_STAGES) */
const STAGES = ["idea", "specify", "build", "proposal", "ship", "accepted", "archived"];
const say = (s: string) => console.log(`skills: ${s}`);

if (!token) {
  say("no PLAY_MCP_TOKEN: no skills written (play's database is their one source).");
  process.exit(0);
}

let rpcId = 0;
/** a play MCP tool: its result as JSON, or it throws with the tool's own words */
async function tool(name: string, args: Record<string, unknown>) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!r.ok) throw new Error(`${name}: play answered ${r.status} ${await r.text()}`);
  const body = (await r.json()) as any;
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  const text = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
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
  let body = `${s.body ?? ""}`.trim();
  if (!body) {
    const stages = STAGES.map((st) => [st, s.stages?.[st]] as const).filter(([, t]) => `${t ?? ""}`.trim());
    body = [`# ${s.label}`, `${s.system ?? ""}`.trim(), ...stages.map(([st, t]) => `## At ${st}\n\n${`${t}`.trim()}`)].filter(Boolean).join("\n\n");
  }
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
