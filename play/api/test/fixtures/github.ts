// A fake GitHub for play's tests (src/github.ts): GitHub's REST API for one repository answered here, behind the real
// client, so every request play makes (its path, its body, its Bearer) is seen.
import { gitHub, type Job, type Pull, type Run, type Says } from "../../src/github";

export const TOKEN = "github_pat_SHIPTOKEN_not_to_be_seen_0123456789";
export const REPO = "MyAvenCEO/maiacity";
export const sha = (n: number) => n.toString(16).padStart(40, "0");

/** `status` GitHub's answer: a 304 (unchanged since the ETag sent) counts against no limit */
type Call = { method: string; path: string; auth: string | null; body: any; status?: number; etag?: string | null };

/** GitHub's REST API for one repository, as play reads and writes it; `calls` is every request it got */
export function fakeGitHub(o: { says?: (s: Says) => void } = {}) {
  /** the client's clock (GitHub's limit is waited out by it); Date.now unless a test sets `clock.at` */
  const clock: { at: number | null } = { at: null };
  /** every call answered so, where set: GitHub's limit (403/429 with its headers) or a refused token (401) */
  let answerAll: { status: number; message: string; headers?: Record<string, string>; only?: RegExp } | null = null;
  const pulls = new Map<number, Pull>();
  const checks = new Map<string, any[]>();
  const runs: Record<string, Run[]> = { "main.yml": [], "release.yml": [], "production.yml": [] };
  const jobs = new Map<number, Job[]>();
  /** each branch's runs, every workflow (GET /actions/runs?branch=) */
  const branchRuns = new Map<string, Run[]>();
  const logs = new Map<number, string>();
  const calls: Call[] = [];
  const merges = new Map<number, string>();
  let mergeRefused: string | null = null;
  let statusRefused: string | null = null;
  // the repository's commits (each its parents and message) and main's head: a merge makes a merge commit on main
  const ROOT = "f".repeat(40);
  const graph = new Map<string, { parents: string[]; message: string; files?: string[]; at?: string }>([[ROOT, { parents: [], message: "the first commit", at: new Date(0).toISOString() }]]);
  const main = { head: ROOT };
  /** each pull request's changed paths (GET /pulls/<n>/files) */
  const pullFiles = new Map<number, string[]>();
  /** main's merge queue (GraphQL): `on` once main's ruleset has one; its entries in order, each its group's commit once built */
  const queue = { on: true, entries: [] as { pr: number; group: string | null; state: string }[], refuse: null as string | null };
  /** why GitHub last removed a pull request from the queue (its timeline's RemovedFromMergeQueueEvent) */
  const removed = new Map<number, { reason: string; at: string; group: string | null }>();
  const gq = (data: unknown) => reply(200, { data });
  const graphql = (query: string, v: Record<string, any>) => {
    const entry = (e: (typeof queue.entries)[number], i: number) => ({ position: i + 1, state: e.state, headCommit: e.group ? { oid: e.group } : null, pullRequest: { number: e.pr } });
    if (query.includes("query MergeQueue"))
      return gq({ repository: { mergeQueue: queue.on ? { entries: { nodes: queue.entries.map(entry) } } : null } });
    if (query.includes("mutation Enqueue")) {
      const n = Number(`${v.pr}`.replace(/^PR_/, ""));
      const pr = pulls.get(n);
      if (!queue.on || queue.refuse || !pr) return reply(200, { errors: [{ message: queue.refuse ?? (pr ? "Merge queue is not enabled" : "Could not resolve to a node") }] });
      if (v.head !== pr.head.sha) return reply(200, { errors: [{ message: "The pull request's head is not the expected head" }] });
      if (!queue.entries.some((e) => e.pr === n)) queue.entries.push({ pr: n, group: null, state: "QUEUED" });
      const i = queue.entries.findIndex((e) => e.pr === n);
      return gq({ enqueuePullRequest: { mergeQueueEntry: { position: i + 1, state: "QUEUED" } } });
    }
    if (query.includes("query PullQueue")) {
      const pr = pulls.get(v.n);
      if (!pr) return gq({ repository: { pullRequest: null } });
      const i = queue.entries.findIndex((e) => e.pr === v.n);
      const r = removed.get(v.n);
      return gq({ repository: { pullRequest: {
        state: pr.merged ? "MERGED" : pr.state.toUpperCase(), merged: pr.merged, mergeCommit: pr.merge_commit_sha ? { oid: pr.merge_commit_sha } : null,
        mergeQueueEntry: i >= 0 ? entry(queue.entries[i], i) : null,
        timelineItems: { nodes: r ? [{ reason: r.reason, createdAt: r.at, beforeCommit: r.group ? { oid: r.group } : null }] : [] },
      } } });
    }
    return reply(200, { errors: [{ message: `no such operation in the fake: ${query.slice(0, 40)}` }] });
  };
  let made = 0xabc000;
  /** a commit of `message` on top of `parents` (main's head by default), main moved to it where `onMain`, changing `files` */
  const commit = (sha_: string, message: string, parents = [main.head], onMain = true, files: string[] = []) => {
    graph.set(sha_, { parents, message, files, at: new Date().toISOString() });
    if (onMain) main.head = sha_;
    return sha_;
  };
  /** every commit `from` reaches, itself first */
  const reach = (from: string) => {
    const seen: string[] = [];
    const todo = [from];
    while (todo.length) {
      const c = todo.shift()!;
      if (seen.includes(c) || !graph.has(c)) continue;
      seen.push(c);
      todo.push(...graph.get(c)!.parents);
    }
    return seen;
  };
  const reply = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const r = await answer(input, init);
    const c = calls.at(-1)!;
    const sent = new Headers(init?.headers).get("if-none-match");
    // ETags as GitHub's: a GET answered 200 carries one; sent back unchanged, it is a 304 that counts against no limit
    if ((init?.method ?? "GET") === "GET" && r.status === 200 && !`${input}`.includes("logs.github.test")) {
      const text = await r.text();
      const etag = `W/"${Bun.hash(text).toString(16)}"`;
      if (sent === etag) return (c.status = 304), new Response(null, { status: 304, headers: { etag } });
      c.status = 200;
      return new Response(text, { status: 200, headers: { "content-type": "application/json", etag } });
    }
    c.status = r.status;
    return r;
  }) as typeof globalThis.fetch;
  const answer = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(`${input}`);
    const headers = new Headers(init?.headers);
    if (url.host === "logs.github.test") {
      calls.push({ method: "GET", path: url.pathname, auth: headers.get("authorization"), body: null });
      return new Response(logs.get(Number(url.pathname.slice(1))) ?? "", { status: 200 });
    }
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(`/repos/${REPO}`, "") + url.search;
    const body = init?.body ? JSON.parse(`${init.body}`) : null;
    calls.push({ method, path, auth: headers.get("authorization"), body, etag: headers.get("if-none-match") });
    if (answerAll && (!answerAll.only || answerAll.only.test(path))) return reply(answerAll.status, { message: answerAll.message }, answerAll.headers);
    const p = url.pathname.replace(`/repos/${REPO}`, "");
    const q = url.searchParams;
    let m: RegExpMatchArray | null;
    if (method === "GET" && (m = p.match(/^\/pulls\/(\d+)$/))) return pulls.has(+m[1]) ? reply(200, { node_id: `PR_${m[1]}`, ...pulls.get(+m[1]) }) : reply(404, { message: "Not Found" });
    if (method === "GET" && (m = p.match(/^\/commits\/([0-9a-f]{40})\/check-runs$/))) return reply(200, { check_runs: checks.get(m[1]) ?? [] });
    if (method === "GET" && (m = p.match(/^\/commits\/([0-9a-f]{40})$/)))
      return graph.has(m[1]) ? reply(200, { sha: m[1], commit: { message: graph.get(m[1])!.message }, parents: graph.get(m[1])!.parents.map((x) => ({ sha: x })) }) : reply(422, { message: `No commit found for SHA: ${m[1]}` });
    if (method === "POST" && p.startsWith("/statuses/")) return statusRefused ? reply(503, { message: statusRefused }) : reply(201, { id: 1, ...body });
    if (method === "GET" && p === "/pulls")
      return reply(200, Number(q.get("page") ?? 1) > 1 ? [] : [...pulls.values()].filter((x) => x.state === "open" && !x.merged && x.base.ref === (q.get("base") ?? x.base.ref)));
    if (method === "GET" && p === "/commits") {
      const from = q.get("sha") === "main" ? main.head : q.get("sha")!;
      if (!graph.has(from)) return reply(422, { message: `No commit found for SHA: ${from}` });
      const per = Number(q.get("per_page") ?? 30);
      const page = Number(q.get("page") ?? 1);
      const since = q.get("since");
      const list = reach(from).filter((c) => !since || (graph.get(c)!.at ?? "") >= since).slice((page - 1) * per, page * per);
      return reply(200, list.map((c) => ({ sha: c, commit: { message: graph.get(c)!.message }, parents: graph.get(c)!.parents.map((x) => ({ sha: x })) })));
    }
    if (method === "GET" && p === "/git/ref/heads/main") return reply(200, { ref: "refs/heads/main", object: { sha: main.head, type: "commit" } });
    if (method === "GET" && (m = p.match(/^\/compare\/(\w+)\.\.\.(\w+)$/))) {
      const [base, head] = [m[1], m[2]].map((r) => (r === "main" ? main.head : r));
      if (!graph.has(base) || !graph.has(head)) return reply(404, { message: "Not Found" });
      const fromBase = reach(base);
      const fromHead = reach(head);
      const mergeBase = fromHead.find((c) => fromBase.includes(c)) ?? ROOT;
      const below = reach(mergeBase);
      const changed = fromHead.filter((c) => !below.includes(c));
      const files = [...new Set(changed.flatMap((c) => graph.get(c)!.files ?? []))].map((filename) => ({ filename }));
      const ahead_by = fromHead.filter((c) => !fromBase.includes(c)).length;
      const behind_by = fromBase.filter((c) => !fromHead.includes(c)).length;
      return reply(200, { status: !ahead_by && !behind_by ? "identical" : !behind_by ? "ahead" : !ahead_by ? "behind" : "diverged", ahead_by, behind_by, merge_base_commit: { sha: mergeBase }, files });
    }
    if (method === "GET" && (m = p.match(/^\/pulls\/(\d+)\/files$/))) {
      const page = Number(q.get("page") ?? 1);
      return reply(200, page === 1 ? (pullFiles.get(+m[1]) ?? []).map((filename) => ({ filename })) : []);
    }
    if (method === "POST" && p === "/graphql") return graphql(body.query as string, body.variables ?? {});
    if (method === "PUT" && (m = p.match(/^\/pulls\/(\d+)\/merge$/))) {
      if (mergeRefused) return reply(405, { message: mergeRefused });
      const pr = pulls.get(+m[1])!;
      if (body.sha !== pr.head.sha) return reply(409, { message: "Head branch was modified. Review and try the merge again." });
      const made = merges.get(pr.number)!;
      if (!graph.has(pr.head.sha)) commit(pr.head.sha, `${pr.title}\n\nIntent: (its branch)`, [main.head], false);
      commit(made, `${body.commit_title}\n\n${body.commit_message}`, [main.head, pr.head.sha]);
      Object.assign(pr, { state: "closed", merged: true, merge_commit_sha: made });
      return reply(200, { sha: made, merged: true, message: "Pull Request successfully merged" });
    }
    if (method === "GET" && (m = p.match(/^\/actions\/workflows\/([\w.]+)\/runs$/))) {
      const created = q.get("created")?.replace(/^>=/, "");
      const list = (runs[m[1]] ?? []).filter(
        (r) => (!q.get("head_sha") || r.head_sha === q.get("head_sha")) && (!q.get("event") || r.event === q.get("event")) && (!created || r.created_at >= created),
      );
      return reply(200, { total_count: list.length, workflow_runs: list });
    }
    if (method === "GET" && p === "/actions/runs") return reply(200, { workflow_runs: branchRuns.get(q.get("branch") ?? "") ?? [] });
    if (method === "GET" && (m = p.match(/^\/actions\/runs\/(\d+)$/))) {
      const found = [...Object.values(runs).flat(), ...[...branchRuns.values()].flat()].find((r) => r.id === +m![1]);
      return found ? reply(200, found) : reply(404, { message: "Not Found" });
    }
    if (method === "GET" && (m = p.match(/^\/actions\/runs\/(\d+)\/jobs$/))) return reply(200, { jobs: jobs.get(+m[1]) ?? [] });
    if (method === "POST" && p.match(/^\/actions\/workflows\/[\w.]+\/dispatches$/)) return reply(204);
    if (method === "POST" && p.match(/^\/actions\/runs\/\d+\/rerun-failed-jobs$/)) return reply(201, {});
    if (method === "GET" && (m = p.match(/^\/actions\/jobs\/(\d+)\/logs$/))) return reply(302, undefined, { location: `https://logs.github.test/${m[1]}` });
    return reply(404, { message: `no route ${method} ${p}` });
  };
  return {
    pulls, checks, runs, branchRuns, jobs, logs, calls, merges, graph, main, commit, pullFiles, queue, removed,
    /** each queued pull request's merge group built: a commit of main and the entries up to it, its checks `runs` */
    build: (runs: (sha: string) => any[] = () => []) => {
      let base = main.head;
      for (const e of queue.entries) {
        e.group ??= commit((++made).toString(16).padStart(40, "0"), `merge group of #${e.pr}`, [base, pulls.get(e.pr)!.head.sha], false);
        e.state = "AWAITING_CHECKS";
        checks.set(e.group, runs(e.group));
        base = e.group;
      }
    },
    /**
     * the queue's front `count` entries landed as one push: each pull request merged as its merge commit (`merges`, or a
     * new one), in a chain on main, main fast-forwarded to the last (the batch's commit, returned)
     */
    land: (count = queue.entries.length) => {
      for (const e of queue.entries.splice(0, count)) {
        const pr = pulls.get(e.pr)!;
        if (!graph.has(pr.head.sha)) commit(pr.head.sha, `${pr.title}\n\nIntent: (its branch)`, [main.head], false);
        const made_ = merges.get(pr.number) ?? (++made).toString(16).padStart(40, "0");
        commit(made_, `${pr.title} (#${pr.number})\n\n${pr.body ?? ""}`, [main.head, pr.head.sha]);
        Object.assign(pr, { state: "closed", merged: true, merge_commit_sha: made_ });
      }
      return main.head;
    },
    /** a pull request GitHub removes from the queue, with its reason; the ones behind it rebuilt without it */
    dequeue: (n: number, reason: string) => {
      const i = queue.entries.findIndex((e) => e.pr === n);
      const [e] = queue.entries.splice(i, 1);
      removed.set(n, { reason, at: new Date(clock.at ?? Date.now()).toISOString(), group: e?.group ?? null });
      for (const x of queue.entries.slice(i)) x.group = null;
    },
    refuseMerge: (why: string | null) => (mergeRefused = why),
    /** every status POST answered 503 with `why`, until null */
    refuseStatus: (why: string | null) => (statusRefused = why),
    answerAll: (how: typeof answerAll) => (answerAll = how),
    clock,
    /** the calls GitHub counts against play's limit: every one but a 304 */
    counted: () => calls.filter((c) => c.status !== 304),
    gh: gitHub({ token: TOKEN, repo: REPO, fetch, api: "https://api.github.test", now: () => clock.at ?? Date.now(), says: o.says }),
    fetch,
    /** what play wrote to GitHub: statuses posted, enqueues, dispatches, re-runs (GraphQL reads aside) */
    writes: () => calls.filter((c) => c.method !== "GET" && !(c.path === "/graphql" && !`${c.body?.query}`.startsWith("mutation"))),
  };
}

export const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
export const green = (name: string, at = Date.now()) => ({ id: Math.floor(Math.random() * 1e9), name, status: "completed", conclusion: "success", started_at: iso(at), html_url: `https://github.test/checks/${name}` });
export const run = (id: number, merge: string, more: Partial<Run> = {}): Run => ({
  id, status: "queued", conclusion: null, html_url: `https://github.test/${REPO}/actions/runs/${id}`, head_sha: merge, event: "push",
  created_at: iso(Date.now()), run_started_at: iso(Date.now()), updated_at: iso(Date.now()), run_attempt: 1, ...more,
});
export const job = (id: number, name: string, status: string, conclusion: string | null, steps?: Job["steps"]): Job => ({
  id, name, status, conclusion, html_url: `https://github.test/${REPO}/actions/runs/1/job/${id}`, started_at: iso(Date.now()), completed_at: conclusion ? iso(Date.now()) : null, ...(steps ? { steps } : {}),
});
