// GitHub as play speaks to it (play/SPEC.md §4.12 "Accept ships it"): its REST API for one repository with SHIP_TOKEN,
// which never leaves this server; the commit statuses play posts; and each open intent's pull request as play last
// read it (its pr_seen: ./substate.ts reads it, so the board asks GitHub nothing); main's merge queue by GraphQL. Ship
// (./ship.ts), conflicts with main (./mainmerge.ts) and the delivery report (./delivery.ts) speak to it through here.
import { COOP } from "./access";
import { intentsIn } from "./kit/ids";
import type { Db } from "./kit/pg";
import { checksSeen, githubSays, type PrSeen } from "./substate";

/** the commit status play posts on the head it enqueues and on each merge group's commit; main's ruleset requires it */
export const ACCEPTED_CONTEXT = "Intent accepted";
/** the commit status play posts on an open intent pull request's head: failure while it conflicts with main (./mainmerge.ts) */
export const MERGES_CONTEXT = "Merges with main";
/** the commit status that wakes an intent's builder on its pull request's head (play/SPEC.md §4.12; intent 40397205): not a required check */
export const INTENT_CONTEXT = "Intent";
/** GitHub's longest status description */
const DESCRIPTION_MOST = 140;
export const fit = (s: string) => (s.length <= DESCRIPTION_MOST ? s : `${s.slice(0, DESCRIPTION_MOST - 1)}…`);
/** the intent on play's board, where the status 'Intent accepted' links to */
export const intentLink = (id: string) => `https://play.maia.city/intents/#${id}`;
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
  body?: string | null;
  /** its GraphQL id, which the merge queue takes */
  node_id?: string;
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

/** one entry of main's merge queue: its pull request, place (1 first), GitHub's state of it, and its merge group's commit */
export type QueueEntry = { pr: number; position: number; state: string; group: string | null };
export type Queued = { state: string; merged: boolean; merge: string | null; entry: QueueEntry | null; removed: { reason: string; at: string; group: string | null } | null };

export type Compare = { status: string; ahead_by: number; behind_by: number; merge_base_commit: { sha: string }; files?: { filename: string; previous_filename?: string }[] };

type Commit = { sha: string; commit: { message: string }; parents: { sha: string }[] };

export class GitHubError extends Error {
  /** `limited`: GitHub's limit (or its refusal of the token) stops this call; said once in the log, by the client */
  constructor(message: string, public status: number, public limited = false) {
    super(message);
  }
}
/** an error the client has logged already (GitHub's limit): its callers say nothing more */
export const quiet = (e: unknown) => e instanceof GitHubError && e.limited;

/** what GitHub says of play now, for the board (./substate.ts githubSays): null while it answers */
export type Says = { why: string; until?: number } | null;
const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);
/** a conditional read (If-None-Match): null where GitHub answered 304, unchanged since `etag` (it counts against no limit) */
export type Read<T> = { data: T; etag?: string } | null;

export type GitHub = ReturnType<typeof gitHub>;

/**
 * GitHub's REST API for one repository (`owner/name`) with a token (SHIP_TOKEN), `fetch` given in the tests. An answer
 * that is no 2xx throws GitHubError with GitHub's own message; neither the token nor any header is ever in it.
 */
export function gitHub({ token, repo, fetch: get = fetch, api = "https://api.github.com", now = Date.now, says }: {
  token: string; repo: string; fetch?: typeof fetch; api?: string; now?: () => number; says?: (s: Says) => void;
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error(`SHIP_REPO is owner/name: ${repo}`);
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "play.maia.city ship" };
  // GitHub's limit (intent b3f83e0b): once it says play has used its calls, no call goes until it allows them again
  let said: Says = null;
  const say = (s: Says) => {
    if (s?.why !== said?.why) console.warn(s ? `ship: ${s.why}` : "ship: GitHub answers play again");
    said = s;
    says?.(s);
  };
  const limitOf = (r: Response, at: number) => {
    const reset = Number(r.headers.get("x-ratelimit-reset")) * 1000, after = Number(r.headers.get("retry-after")) * 1000;
    return after > 0 ? at + after : reset > at ? reset : at + 60_000;
  };
  const call = async (method: string, path: string, body?: unknown, redirect: RequestRedirect = "follow", etag?: string, url = `${api}/repos/${repo}${path}`) => {
    const at = now();
    if (said?.until && at < said.until) throw new GitHubError(said.why, 429, true);
    const r = await get(url, {
      method,
      redirect,
      // an Accept holds its intent's row while it asks, and the watcher looks once at a time: no call hangs on
      signal: AbortSignal.timeout(CALL_MS),
      headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }), ...(etag ? { "if-none-match": etag } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (redirect === "manual" && r.status >= 300 && r.status < 400) return r;
    if (r.status === 304 && etag) return r;
    if (!r.ok) {
      const message = await r.json().then((j: any) => j?.message, () => null);
      const limited = (r.status === 403 || r.status === 429) && (r.headers.get("x-ratelimit-remaining") === "0" || r.headers.has("retry-after") || /rate limit/i.test(message ?? ""));
      if (limited) {
        const until = limitOf(r, at);
        say({ why: `GitHub's limit: play reads again at ${hhmm(until)}`, until });
        throw new GitHubError(said!.why, r.status, true);
      }
      const why = `GitHub answered ${r.status} to ${method} ${path.split("?")[0] || "/graphql"}${message ? `: ${message}` : ""}`;
      // a refused token: the board names it, the log says it once
      if (r.status === 401) say({ why: "GitHub refuses play's token (SHIP_TOKEN)" });
      throw new GitHubError(why, r.status, r.status === 401);
    }
    // the last call of the hour answered: none goes until GitHub's reset
    if (r.headers.get("x-ratelimit-remaining") === "0") {
      const until = limitOf(r, at);
      say({ why: `GitHub's limit: play reads again at ${hhmm(until)}`, until });
    } else if (said) say(null);
    return r;
  };
  const read = async <T>(path: string, etag?: string): Promise<Read<T>> => {
    const r = await call("GET", path, undefined, "follow", etag);
    return r.status === 304 ? null : { data: (await r.json()) as T, etag: r.headers.get("etag") ?? undefined };
  };
  const json = async <T>(method: string, path: string, body?: unknown) => {
    const r = await call(method, path, body);
    return (r.status === 204 ? null : await r.json()) as T;
  };
  /** GitHub's GraphQL API (the merge queue has no REST), its `errors` thrown as GitHubError; `owner` and `name` are this repository's */
  const graphql = async <T>(query: string, variables: Record<string, unknown>): Promise<T> => {
    const [owner, name] = repo.split("/");
    const r = await call("POST", "", { query, variables: { owner, name, ...variables } }, "follow", undefined, `${api}/graphql`);
    const j: any = await r.json();
    if (j.errors?.length) throw new GitHubError(`GitHub's GraphQL answered: ${j.errors.map((e: any) => e.message).join("; ")}`, 422);
    return j.data as T;
  };
  const q = (o: Record<string, string | number | undefined>) =>
    Object.entries(o)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(`${v}`)}`)
      .join("&");
  return {
    repo,
    pull: (n: number) => json<Pull>("GET", `/pulls/${n}`),
    /** the open pull requests into main (up to 300) */
    openPulls: async () => {
      const out: Pull[] = [];
      for (let page = 1; page <= 3; page++) {
        const got = await json<Pull[]>("GET", `/pulls?${q({ state: "open", base: "main", per_page: 100, page })}`);
        out.push(...got);
        if (got.length < 100) break;
      }
      return out;
    },
    checkRuns: async (sha: string) => (await json<{ check_runs: any[] }>("GET", `/commits/${sha}/check-runs?per_page=100`)).check_runs,
    /** the pull request and its head's check runs read again only where they changed since `etag` (./watcher.ts) */
    pullIf: (n: number, etag?: string) => read<Pull>(`/pulls/${n}`, etag),
    checkRunsIf: (sha: string, etag?: string) => read<{ check_runs: any[] }>(`/commits/${sha}/check-runs?per_page=100`, etag),
    /** what GitHub says of play now: its limit until a time, or its token refused; null while it answers */
    says: () => (said?.until && now() >= said.until ? null : said),
    /** a commit status on `sha`, 'Intent accepted' unless `context` names another ('Merges with main', ./mainmerge.ts) */
    status: (sha: string, { context = ACCEPTED_CONTEXT, ...s }: { state: "success" | "failure" | "error" | "pending"; description: string; target_url?: string; context?: string }) =>
      json("POST", `/statuses/${sha}`, { ...s, context }),
    commit: (sha: string) => json<Commit>("GET", `/commits/${sha}`),
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
    /** main's merge queue (GitHub's GraphQL): its entries in order, each its group's commit; null where main's ruleset has none */
    mergeQueue: async (branch = "main") => {
      const d = await graphql<any>(`query MergeQueue($owner: String!, $name: String!, $branch: String!) { repository(owner: $owner, name: $name) { mergeQueue(branch: $branch) {
        entries(first: 100) { nodes { position state headCommit { oid } pullRequest { number } } } } } }`, { branch });
      const q = d.repository?.mergeQueue;
      return q ? (q.entries?.nodes ?? []).map((e: any): QueueEntry => ({ pr: e.pullRequest?.number, position: e.position, state: e.state, group: e.headCommit?.oid ?? null })).sort((a: QueueEntry, b: QueueEntry) => a.position - b.position) : null;
    },
    /** a pull request added to the merge queue (GraphQL enqueuePullRequest), refused by GitHub where its head is no longer `head` */
    enqueue: async (nodeId: string, head: string) =>
      (await graphql<any>(`mutation Enqueue($pr: ID!, $head: GitObjectID) { enqueuePullRequest(input: { pullRequestId: $pr, expectedHeadOid: $head }) { mergeQueueEntry { position state } } }`, { pr: nodeId, head }))
        .enqueuePullRequest?.mergeQueueEntry as { position: number; state: string } | null,
    /** a pull request as the queue has it: merged (its merge commit), queued (its entry), or neither (why GitHub last removed it) */
    queued: async (n: number): Promise<Queued> => {
      const d = await graphql<any>(`query PullQueue($owner: String!, $name: String!, $n: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $n) {
        state merged mergeCommit { oid } mergeQueueEntry { position state headCommit { oid } }
        timelineItems(last: 1, itemTypes: [REMOVED_FROM_MERGE_QUEUE_EVENT]) { nodes { ... on RemovedFromMergeQueueEvent { reason createdAt beforeCommit { oid } } } } } } }`, { n });
      const p = d.repository?.pullRequest;
      if (!p) throw new GitHubError(`GitHub knows no pull request #${n}`, 404);
      const e = p.mergeQueueEntry, r = p.timelineItems?.nodes?.[0];
      return { state: p.state, merged: !!p.merged, merge: p.mergeCommit?.oid ?? null, entry: e ? { pr: n, position: e.position, state: e.state, group: e.headCommit?.oid ?? null } : null, removed: r ? { reason: r.reason ?? "", at: r.createdAt, group: r.beforeCommit?.oid ?? null } : null };
    },
    runs: async (workflow: string, filter: { head_sha?: string; event?: string; created?: string }) =>
      (await json<{ workflow_runs: Run[] }>("GET", `/actions/workflows/${workflow}/runs?${q({ ...filter, per_page: 30 })}`)).workflow_runs,
    /** a branch's runs, every workflow, newest first (./delivery.ts) */
    branchRuns: async (branch: string) => (await json<{ workflow_runs: Run[] }>("GET", `/actions/runs?${q({ branch, per_page: 100 })}`)).workflow_runs,
    run: (id: number) => json<Run>("GET", `/actions/runs/${id}`),
    jobs: async (run: number) => (await json<{ jobs: Job[] }>("GET", `/actions/runs/${run}/jobs?per_page=100`)).jobs,
    dispatch: (workflow: string, ref: string, inputs: Record<string, string>) => json("POST", `/actions/workflows/${workflow}/dispatches`, { ref, inputs }),
    rerunFailed: (run: number) => json("POST", `/actions/runs/${run}/rerun-failed-jobs`, {}),
    /** one page of the commits a ref or sha reaches (itself first), newest first; `since` an ISO time, none before it */
    commits: (ref: string, page: number, since?: string) => json<Commit[]>("GET", `/commits?${q({ sha: ref, per_page: 100, page, since })}`),
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
  return token ? gitHub({ token, repo: env.SHIP_REPO?.trim() || "MyAvenCEO/maiacity", api: env.SHIP_API?.trim() || undefined, says: (s) => (githubSays.now = s) }) : null;
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
/**
 * A pull request read again for the watcher, conditionally (intent b3f83e0b): the pull and its head's check runs ask
 * GitHub with the ETags kept in `was`; a 304 (unchanged, counting against no limit) keeps what was read, fresh at `at`.
 */
export async function readSeen(gh: GitHub, n: number, was: PrSeen | null | undefined, at = Date.now()): Promise<PrSeen> {
  const old = was?.pr === n ? was : null;
  const p = await gh.pullIf(n, old?.etags?.pull);
  const pr = p?.data;
  const head = pr ? pr.head.sha : old!.head;
  const open = pr ? pr.state === "open" && !pr.merged : old!.state === "open" && !old!.merged;
  const c = open ? await gh.checkRunsIf(head, old?.etags?.head === head ? old.etags.checks : undefined) : { data: { check_runs: [] }, etag: undefined };
  const base = pr ? { pr: pr.number, head, draft: !!pr.draft, mergeable: pr.mergeable, state: pr.merged ? "merged" : pr.state, merged: !!pr.merged, base: pr.base.ref } : old!;
  const checks = c ? checksSeen(c.data.check_runs) : old!.checks;
  const etags = { pull: p ? p.etag : old!.etags?.pull, head, checks: c ? c.etag : old!.etags?.checks };
  return { pr: base.pr, head, draft: base.draft, mergeable: base.mergeable, state: base.state, merged: base.merged, base: base.base, checks, at: new Date(at).toISOString(), etags };
}
/** a pull request read again, with what play keeps across reads: the statuses it posted, the conflict's files at the same head */
export const keptFrom = (was: PrSeen | null | undefined, seen: PrSeen): PrSeen =>
  was?.pr !== seen.pr ? seen : { ...seen, ...(was.posted ? { posted: was.posted } : {}), ...(was.conflicts?.head === seen.head ? { conflicts: was.conflicts } : {}) };
/** a pull request as just read, kept as its intent's pr_seen */
export const keepSeen = (q: Pick<Db, "query">, id: string, seen: PrSeen) => q.query(`UPDATE play.intents SET pr_seen = ($2::text)::jsonb WHERE id = $1`, [id, JSON.stringify(seen)]);

/** a status as play keeps it on pr_seen, per context: on `head`; `sent: false` while GitHub has not taken it */
export type Posted = { head: string; state: "success" | "failure" | "error" | "pending"; description: string; sent?: false };

/**
 * The one poster of every commit status play puts on GitHub (`Intent accepted`, `Merges with main`), each line once
 * per head and context, its memory kept on the intent's pr_seen (`posted`). `again`: a GitHub error is logged and kept
 * unsent for the next tick (postAgain) instead of thrown.
 */
export async function postStatus(q: Pick<Db, "query">, gh: GitHub, id: string, seen: PrSeen, context: string, state: Posted["state"], line: string, o: { head?: string; again?: boolean } = {}) {
  const want: Posted = { head: o.head ?? seen.head, state, description: fit(line) };
  const was = seen.posted?.[context];
  if (was && was.sent !== false && was.head === want.head && was.state === state && was.description === want.description) return;
  try {
    if (!want.head) throw new Error("no head read yet");
    await gh.status(want.head, { state, description: want.description, target_url: intentLink(id), context });
  } catch (e) {
    if (!o.again) throw e;
    console.warn(`github: '${context}' not posted for intent ${id} (posted on the next tick): ${(e as Error).message}`);
    seen.posted = { ...seen.posted, [context]: { ...want, sent: false } };
    return void (await keepSeen(q, id, seen));
  }
  seen.posted = { ...seen.posted, [context]: want };
  await keepSeen(q, id, seen);
}

/** the open intents (Build or Proposal, or `stages`) that name a pull request, each with it as last read */
export async function openPulls(q: Pick<Db, "query">, stages = ["build", "proposal"]) {
  const { rows } = await q.query<{ id: string; pull_request: number; pr_seen: PrSeen | null }>(
    `SELECT id, pull_request, pr_seen FROM play.intents WHERE coop_id = $1 AND stage = ANY($2::text[]) AND pull_request IS NOT NULL ORDER BY created, id`,
    [COOP, stages],
  );
  return rows;
}

/** a pull request not read yet: read on the next tick (./watcher.ts), what was posted on it kept */
const unread = (pr: number): PrSeen => ({ pr, head: "", draft: false, mergeable: null, state: "open", merged: false, base: "main", checks: {}, at: new Date(0).toISOString() });

/**
 * The status 'Intent' on the head of the intent's pull request (`head` where named: the commit its checks were recorded
 * on, the head it shipped), each line once per head (play/SPEC.md §4.12; intent 40397205): its builder, watching its pull
 * request, is woken by it. Never throws: GitHub unreachable, it is logged and posted on the next tick (postAgain).
 */
export async function wake(q: Pick<Db, "query">, gh: GitHub | null | undefined, id: string, state: Posted["state"], line: string, head?: string) {
  if (!gh) return;
  try {
    const { rows: [row] } = await q.query<{ pull_request: number | null; pr_seen: PrSeen | null }>(`SELECT pull_request, pr_seen FROM play.intents WHERE id = $1`, [id]);
    if (!row?.pull_request) return;
    const n = row.pull_request;
    const seen =
      row.pr_seen?.pr === n ? row.pr_seen : await readPull(gh, n).then((r) => r.seen, (e) => (console.warn(`github: #${n} not read: ${(e as Error).message}`), unread(n)));
    await postStatus(q, gh, id, seen, INTENT_CONTEXT, state, line, { head, again: true });
  } catch (e) {
    console.warn(`github: '${INTENT_CONTEXT}' not kept for intent ${id}: ${(e as Error).message}`);
  }
}

/** Every status GitHub did not take, posted again (each tick of ./watcher.ts). */
export async function postAgain(q: Pick<Db, "query">, gh: GitHub) {
  const { rows } = await q.query<{ id: string; pr_seen: PrSeen }>(
    `SELECT id, pr_seen FROM play.intents WHERE coop_id = $1 AND jsonb_path_exists(pr_seen, '$.posted.* ? (@.sent == false)') ORDER BY created, id`,
    [COOP],
  );
  for (const { id, pr_seen } of rows)
    for (const [context, p] of Object.entries(pr_seen.posted ?? {}))
      if (p.sent === false) await postStatus(q, gh, id, pr_seen, context, p.state as Posted["state"], p.description, { head: p.head || undefined, again: true });
}

/**
 * A draft into main naming an intent at Specify that names no pull request yet, the only one naming it, taken as its
 * pull request (play/SPEC.md §4.12; intent 40397205): its builder opened it while the spec waits, and approval reaches it.
 */
export async function adoptDrafts(q: Pick<Db, "query">, gh: GitHub, at = Date.now()) {
  const { rows } = await q.query<{ id: string }>(`SELECT id FROM play.intents WHERE coop_id = $1 AND stage = 'specify' AND pull_request IS NULL`, [COOP]);
  if (!rows.length) return;
  const open = await gh.openPulls();
  for (const { id } of rows) {
    const naming = open.filter((p) => intentsIn(p.body, { indented: true }).includes(id));
    if (naming.length !== 1 || !naming[0].draft) continue;
    const n = naming[0].number;
    await q.query(`UPDATE play.intents SET pull_request = $2 WHERE id = $1 AND stage = 'specify' AND pull_request IS NULL`, [id, n]);
    await keepSeen(q, id, (await readPull(gh, n, at)).seen);
    console.log(`github: draft #${n} is intent ${id}'s pull request while its spec waits`);
  }
}
