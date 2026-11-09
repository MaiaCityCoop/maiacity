// GitHub as play speaks to it (play/SPEC.md §4.12 "Accept ships it"): its REST API for one repository with SHIP_TOKEN,
// which never leaves this server; the commit statuses play posts; and each open intent's pull request as play last
// read it (its pr_seen: ./substate.ts reads it, so the board asks GitHub nothing). Ship (./ship.ts), main merged in
// (./mainmerge.ts) and the delivery report (./delivery.ts) speak to it through here.
import { COOP } from "./access";
import type { Db } from "./kit/pg";
import { checksSeen, type PrSeen } from "./substate";

/** the commit status play posts on the head it merges; main's ruleset requires it */
export const ACCEPTED_CONTEXT = "Intent accepted";
/** the commit status play posts on an open intent pull request's head: failure while it conflicts with main (./mainmerge.ts) */
export const MERGES_CONTEXT = "Merges with main";
/** the intent on play's board, where the status 'Intent accepted' links to */
export const intentLink = (id: string) => `https://play.maia.city/intents/#${id}`;
/** how long one call to GitHub may take */
const CALL_MS = 30_000;

export type Pull = {
  number: number;
  state: string;
  merged: boolean;
  merge_commit_sha: string | null;
  mergeable: boolean | null;
  draft?: boolean;
  base: { ref: string };
  head: { sha: string; ref: string };
  html_url: string;
  title: string;
};
export type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_sha: string;
  event: string;
  display_title?: string;
  name?: string;
  head_branch?: string;
  created_at: string;
  run_started_at?: string;
  updated_at?: string;
  run_attempt?: number;
};
export type Job = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  started_at?: string | null;
  completed_at?: string | null;
  steps?: { name: string; status: string; conclusion: string | null; started_at?: string | null; completed_at?: string | null }[];
};

export type Compare = { status: string; ahead_by: number; behind_by: number; merge_base_commit: { sha: string }; files?: { filename: string; previous_filename?: string }[] };

export type Commit = { sha: string; commit: { message: string }; parents: { sha: string }[] };

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type GitHub = ReturnType<typeof gitHub>;

/**
 * GitHub's REST API for one repository (`owner/name`) with a token (SHIP_TOKEN), `fetch` given in the tests. An answer
 * that is no 2xx throws GitHubError with GitHub's own message; neither the token nor any header is ever in it.
 */
export function gitHub({ token, repo, fetch: get = fetch, api = "https://api.github.com" }: { token: string; repo: string; fetch?: typeof fetch; api?: string }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`SHIP_REPO is owner/name: ${repo}`);
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "play.maia.city ship" };
  const call = async (method: string, path: string, body?: unknown, redirect: RequestRedirect = "follow") => {
    const r = await get(`${api}/repos/${repo}${path}`, {
      method,
      redirect,
      // an Accept holds its intent's row while it asks, and the watcher looks once at a time: no call hangs on
      signal: AbortSignal.timeout(CALL_MS),
      headers: body === undefined ? headers : { ...headers, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (redirect === "manual" && r.status >= 300 && r.status < 400) return r;
    if (!r.ok) {
      const said = await r.json().then((j: any) => j?.message, () => null);
      throw new GitHubError(`GitHub answered ${r.status} to ${method} ${path.split("?")[0]}${said ? `: ${said}` : ""}`, r.status);
    }
    return r;
  };
  const json = async <T>(method: string, path: string, body?: unknown) => {
    const r = await call(method, path, body);
    return (r.status === 204 ? null : await r.json()) as T;
  };
  const q = (o: Record<string, string | number | undefined>) =>
    Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(`${v}`)}`)
      .join("&");
  return {
    repo,
    pull: (n: number) => json<Pull>("GET", `/pulls/${n}`),
    checkRuns: async (sha: string) => (await json<{ check_runs: any[] }>("GET", `/commits/${sha}/check-runs?per_page=100`)).check_runs,
    /** a commit status on `sha`, 'Intent accepted' unless `context` names another ('Merges with main', ./mainmerge.ts) */
    status: (sha: string, { context = ACCEPTED_CONTEXT, ...s }: { state: "success" | "failure" | "error" | "pending"; description: string; target_url?: string; context?: string }) =>
      json("POST", `/statuses/${sha}`, { ...s, context }),
    /** a branch's head commit */
    branchHead: async (branch: string) => (await json<{ object: { sha: string } }>("GET", `/git/ref/heads/${branch}`)).object.sha,
    /** `head` against `base` (three dots): how far each is past their merge base, and the files `head` changed since it */
    compare: (base: string, head: string) => json<Compare>("GET", `/compare/${base}...${head}`),
    /** the paths a pull request changes (up to 3,000, GitHub's most) */
    pullFiles: async (n: number) => {
      const out: string[] = [];
      for (let page = 1; page <= 30; page++) {
        const got = await json<{ filename: string; previous_filename?: string }[]>("GET", `/pulls/${n}/files?${q({ per_page: 100, page })}`);
        for (const f of got) out.push(f.filename, ...(f.previous_filename ? [f.previous_filename] : []));
        if (got.length < 100) break;
      }
      return out;
    },
    /** main merged into a pull request's branch (GitHub's update-branch), refused (422) where its head is no longer `head` */
    updateBranch: (n: number, head: string) => json<{ message?: string }>("PUT", `/pulls/${n}/update-branch`, { expected_head_sha: head }),
    merge: (n: number, sha: string, commit_title: string, commit_message: string) =>
      json<{ sha: string; merged: boolean }>("PUT", `/pulls/${n}/merge`, { merge_method: "merge", sha, commit_title, commit_message }),
    runs: async (workflow: string, filter: { head_sha?: string; event?: string; created?: string }) =>
      (await json<{ workflow_runs: Run[] }>("GET", `/actions/workflows/${workflow}/runs?${q({ ...filter, per_page: 30 })}`)).workflow_runs,
    /** a branch's runs, every workflow, newest first (./delivery.ts) */
    branchRuns: async (branch: string) => (await json<{ workflow_runs: Run[] }>("GET", `/actions/runs?${q({ branch, per_page: 100 })}`)).workflow_runs,
    /** one run */
    run: (id: number) => json<Run>("GET", `/actions/runs/${id}`),
    jobs: async (run: number) => (await json<{ jobs: Job[] }>("GET", `/actions/runs/${run}/jobs?per_page=100`)).jobs,
    dispatch: (workflow: string, ref: string, inputs: Record<string, string>) => json("POST", `/actions/workflows/${workflow}/dispatches`, { ref, inputs }),
    rerunFailed: (run: number) => json("POST", `/actions/runs/${run}/rerun-failed-jobs`, {}),
    /** one page of the commits a ref or sha reaches (itself first), newest first */
    commits: (ref: string, page: number) => json<Commit[]>("GET", `/commits?${q({ sha: ref, per_page: 100, page })}`),
    /** a job's log: GitHub answers with a signed address, fetched without the token */
    log: async (job: number) => {
      const r = await call("GET", `/actions/jobs/${job}/logs`, undefined, "manual");
      const at = r.headers.get("location");
      if (!at) return await r.text();
      const l = await get(at, { headers: { "user-agent": headers["user-agent"] }, signal: AbortSignal.timeout(CALL_MS) });
      if (!l.ok) throw new GitHubError(`the job's log answered ${l.status}`, l.status);
      return await l.text();
    },
  };
}

/**
 * play's GitHub, where SHIP_TOKEN is set (the repository SHIP_REPO, MyAvenCEO/maiacity by default), else null;
 * SHIP_API names another GitHub API than api.github.com, for a play run against a stand-in (never set in production)
 */
export function shipGitHub(env: Record<string, string | undefined> = process.env): GitHub | null {
  const token = env.SHIP_TOKEN?.trim();
  return token ? gitHub({ token, repo: env.SHIP_REPO?.trim() || "MyAvenCEO/maiacity", api: env.SHIP_API?.trim() || undefined }) : null;
}

/** the latest of the check runs of each name (a re-run after a red one) */
function latestRuns(runs: any[]) {
  const by = new Map<string, any>();
  for (const r of runs) {
    const was = by.get(r.name);
    if (!was || `${r.started_at ?? ""}` > `${was.started_at ?? ""}` || (r.started_at === was.started_at && r.id > was.id)) by.set(r.name, r);
  }
  return by;
}

/** a pull request as GitHub has it now, kept as the intent's pr_seen: its head's checks read where it is open */
export async function readPull(gh: GitHub, n: number, at = Date.now()): Promise<{ pr: Pull; seen: PrSeen; runs: Map<string, any> }> {
  const pr = await gh.pull(n);
  const open = pr.state === "open" && !pr.merged;
  const all = open ? await gh.checkRuns(pr.head.sha) : [];
  const seen: PrSeen = {
    pr: pr.number, head: pr.head.sha, draft: !!pr.draft, mergeable: pr.mergeable, state: pr.merged ? "merged" : pr.state, merged: !!pr.merged,
    base: pr.base.ref, checks: checksSeen(all), at: new Date(at).toISOString(),
  };
  return { pr, seen, runs: latestRuns(all) };
}
/** a pull request as just read, kept as its intent's pr_seen */
export const keepSeen = (q: Pick<Db, "query">, id: string, seen: PrSeen) => q.query(`UPDATE play.intents SET pr_seen = ($2::text)::jsonb WHERE id = $1`, [id, JSON.stringify(seen)]);

/** the open intents (Build or Proposal) that name a pull request, each with it as last read */
export async function openPulls(q: Pick<Db, "query">) {
  const { rows } = await q.query<{ id: string; pull_request: number; pr_seen: PrSeen | null }>(
    `SELECT id, pull_request, pr_seen FROM play.intents WHERE coop_id = $1 AND stage IN ('build', 'proposal') AND pull_request IS NOT NULL ORDER BY created, id`,
    [COOP],
  );
  return rows;
}
