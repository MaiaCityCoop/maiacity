#!/usr/bin/env bun
// Intent named (play/SPEC.md §4.12; Samuel 2026-11-06): every pull request into main is one intent's, its body and
// commits carrying `Intent: <uuid>`, and the intent's one active pull request (check_intent's `pr`).
//
//   bun play/avenbox/pr-intent.ts <pull request number>          the check: green, or red saying why (exit 1)
//   bun play/avenbox/pr-intent.ts <pull request number> --id     prints the one intent's UUID, or fails as the check
//
// Red when it names no intent or several, one not at Build, Proposal or Ship, or isn't the active one while that is
// open. Reads GitHub (read only) and play (get_intent); runs from main in intent-named.yml and intents-pr.yml, never
// checking the pull request out.
import { intentsIn as trailers } from "../api/src/kit/ids";
import { call, PLAY_MCP } from "./play";

const LIVE = ["build", "proposal", "ship"];

/** the intents a text names on its `Intent: <uuid>` lines, lower case, an indented line too */
const intentsIn = (text: string | null | undefined) => trailers(text, { indented: true });

export type Verdict = { ok: boolean; intent?: string; why: string; notes: string[] };
type Env = { github: string; repo: string; ghToken?: string; play: string; playToken?: string };

type Pull = { title?: string | null; body?: string | null; state?: string; merged_at?: string | null };
type Commit = { commit?: { message?: string | null } };

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${url} answered ${r.status}`);
  return r.json() as Promise<T>;
}

/** the verdict on pull request `n`: whether it names its one intent, live, and is its active pull request */
export async function judge(n: number, env: Env): Promise<Verdict> {
  const gh = { accept: "application/vnd.github+json", ...(env.ghToken ? { authorization: `Bearer ${env.ghToken}` } : {}) };
  const base = `${env.github.replace(/\/$/, "")}/repos/${env.repo}`;
  const pull = await getJson<Pull>(`${base}/pulls/${n}`, gh);
  const commits: Commit[] = [];
  for (let page = 1; page <= 10; page++) {
    const got = await getJson<Commit[]>(`${base}/pulls/${n}/commits?per_page=100&page=${page}`, gh);
    commits.push(...got);
    if (got.length < 100) break;
  }
  const notes: string[] = [];
  const named = new Set([...intentsIn(pull.body), ...commits.flatMap((c) => intentsIn(c.commit?.message))]);
  if (named.size === 0)
    return { ok: false, why: `#${n} names no intent: put the line \`Intent: <the intent's UUID>\` in its body and at the end of its commits' messages (.github/pull_request_template.md).`, notes };
  if (named.size > 1)
    return { ok: false, why: `#${n} names ${named.size} intents (${[...named].join(", ")}): a pull request is the work of exactly one intent; split it, one pull request each.`, notes };
  const intent = [...named][0];
  if (!intentsIn(pull.body).includes(intent)) notes.push(`its body does not carry \`Intent: ${intent}\`: only its commits do`);
  if (!`${pull.title ?? ""}`.includes(`[${intent.slice(0, 8)}]`)) notes.push(`its title does not show [${intent.slice(0, 8)}] (only shown)`);

  const res = await call("get_intent", { intent }, { endpoint: env.play, token: env.playToken });
  if (res.isError) return { ok: false, intent, why: `#${n} names intent ${intent}, which play does not know: ${res.text || "no answer"}.`, notes };
  const it = JSON.parse(res.text);
  if (!LIVE.includes(it.stage))
    return { ok: false, intent, why: `#${n} names intent ${intent}, which is at the ${it.stage} stage: a pull request is the work of an intent at Build, Proposal or Ship.`, notes };
  const active = it.pull_request as number | null;
  if (active && active !== n) {
    let unread = "";
    const other = await getJson<Pull>(`${base}/pulls/${active}`, gh).catch((e: Error) => ((unread = e.message), null));
    if (other?.state === "open")
      return { ok: false, intent, why: `#${n} is not the active pull request of intent ${intent}: #${active} is, and open. Consolidate this work into #${active}, or close this one.`, notes };
    notes.push(`the intent's pull request was #${active} (${other?.merged_at ? "merged" : unread ? `unread: ${unread}` : "closed"}): its run names this one`);
  }
  return { ok: true, intent, why: `#${n} is the work of intent ${intent} (${it.stage})${active === n ? ", its active pull request" : active ? "" : ", none named yet"}.`, notes };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const n = Number(`${args.find((a) => !a.startsWith("--")) ?? ""}`.replace(/^#/, ""));
  if (!Number.isInteger(n) || n < 1) {
    console.error("bun play/avenbox/pr-intent.ts <pull request number> [--id]");
    process.exit(2);
  }
  const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_TOKEN, PLAY_MCP_TOKEN } = process.env;
  if (!GITHUB_REPOSITORY) {
    console.error("GITHUB_REPOSITORY is not set (owner/name).");
    process.exit(2);
  }
  const v = await judge(n, {
    github: GITHUB_API_URL || "https://api.github.com",
    repo: GITHUB_REPOSITORY,
    ghToken: GITHUB_TOKEN,
    play: PLAY_MCP,
    playToken: PLAY_MCP_TOKEN,
  }).catch((e) => ({ ok: false, why: `Intent named could not read it: ${(e as Error).message}`, notes: [] }) as Verdict);
  if (args.includes("--id")) {
    if (!v.ok) {
      console.error(v.why);
      process.exit(1);
    }
    console.log(v.intent);
    process.exit(0);
  }
  console.log(`${v.ok ? "✓" : "✗"} ${v.why}`);
  for (const note of v.notes) console.log(`  · ${note}`);
  if (!v.ok) console.log(`::error title=Intent named::${v.why}`);
  process.exit(v.ok ? 0 : 1);
}
