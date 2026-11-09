// A fake GitHub for play's tests (src/ship.ts): GitHub's REST API for one repository answered here, behind the real
// client, so every request play makes (its path, its body, its Bearer) is seen.
import { gitHub, type Job, type Pull, type Run } from "../../src/ship";

export const TOKEN = "github_pat_SHIPTOKEN_not_to_be_seen_0123456789";
export const REPO = "MyAvenCEO/maiacity";
export const sha = (n: number) => n.toString(16).padStart(40, "0");

type Call = { method: string; path: string; auth: string | null; body: any };

/** GitHub's REST API for one repository, as play reads and writes it; `calls` is every request it got */
export function fakeGitHub() {
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
  // the repository's commits (each its parents and message) and main's head: a merge makes a merge commit on main
  const ROOT = "f".repeat(40);
  const graph = new Map<string, { parents: string[]; message: string; files?: string[] }>([[ROOT, { parents: [], message: "the first commit" }]]);
  const main = { head: ROOT };
  /** each pull request's changed paths (GET /pulls/<n>/files); update-branch refused with `updateRefused` where set */
  const pullFiles = new Map<number, string[]>();
  let updateRefused: { status: number; message: string } | null = null;
  let made = 0xabc000;
  /** a commit of `message` on top of `parents` (main's head by default), main moved to it where `onMain`, changing `files` */
  const commit = (sha_: string, message: string, parents = [main.head], onMain = true, files: string[] = []) => {
    graph.set(sha_, { parents, message, files });
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
    const url = new URL(`${input}`);
    const headers = new Headers(init?.headers);
    if (url.host === "logs.github.test") {
      calls.push({ method: "GET", path: url.pathname, auth: headers.get("authorization"), body: null });
      return new Response(logs.get(Number(url.pathname.slice(1))) ?? "", { status: 200 });
    }
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(`/repos/${REPO}`, "") + url.search;
    const body = init?.body ? JSON.parse(`${init.body}`) : null;
    calls.push({ method, path, auth: headers.get("authorization"), body });
    const p = url.pathname.replace(`/repos/${REPO}`, "");
    const q = url.searchParams;
    let m: RegExpMatchArray | null;
    if (method === "GET" && (m = p.match(/^\/pulls\/(\d+)$/))) return pulls.has(+m[1]) ? reply(200, pulls.get(+m[1])) : reply(404, { message: "Not Found" });
    if (method === "GET" && (m = p.match(/^\/commits\/([0-9a-f]{40})\/check-runs$/))) return reply(200, { check_runs: checks.get(m[1]) ?? [] });
    if (method === "GET" && (m = p.match(/^\/commits\/([0-9a-f]{40})$/)))
      return graph.has(m[1]) ? reply(200, { sha: m[1], commit: { message: graph.get(m[1])!.message }, parents: graph.get(m[1])!.parents.map((x) => ({ sha: x })) }) : reply(422, { message: `No commit found for SHA: ${m[1]}` });
    if (method === "POST" && p.startsWith("/statuses/")) return reply(201, { id: 1, ...body });
    if (method === "GET" && p === "/commits") {
      const from = q.get("sha") === "main" ? main.head : q.get("sha")!;
      if (!graph.has(from)) return reply(422, { message: `No commit found for SHA: ${from}` });
      const per = Number(q.get("per_page") ?? 30);
      const page = Number(q.get("page") ?? 1);
      const list = reach(from).slice((page - 1) * per, page * per);
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
    if (method === "PUT" && (m = p.match(/^\/pulls\/(\d+)\/update-branch$/))) {
      const pr = pulls.get(+m[1]);
      if (!pr) return reply(404, { message: "Not Found" });
      if (updateRefused) return reply(updateRefused.status, { message: updateRefused.message });
      if (body.expected_head_sha !== pr.head.sha) return reply(422, { message: "expected head sha didn't match current head ref." });
      // main merged into the branch: a merge commit, the branch's new head (its checks not run yet)
      const merged = (++made).toString(16).padStart(40, "0");
      commit(merged, `Merge branch 'main' into ${pr.head.ref}`, [pr.head.sha, main.head], false);
      pr.head.sha = merged;
      return reply(202, { message: "Updating pull request branch.", url: pr.html_url });
    }
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
  }) as typeof globalThis.fetch;
  return {
    pulls, checks, runs, branchRuns, jobs, logs, calls, merges, graph, main, commit, pullFiles,
    refuseMerge: (why: string | null) => (mergeRefused = why),
    refuseUpdate: (how: { status: number; message: string } | null) => (updateRefused = how),
    gh: gitHub({ token: TOKEN, repo: REPO, fetch, api: "https://api.github.test" }),
    fetch,
    /** what play wrote to GitHub: statuses posted, merges, dispatches, re-runs */
    writes: () => calls.filter((c) => c.method !== "GET"),
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
