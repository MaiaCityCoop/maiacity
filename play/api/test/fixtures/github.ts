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
  const logs = new Map<number, string>();
  const calls: Call[] = [];
  const merges = new Map<number, string>();
  let mergeRefused: string | null = null;
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
    if (method === "POST" && p.startsWith("/statuses/")) return reply(201, { id: 1, ...body });
    if (method === "PUT" && (m = p.match(/^\/pulls\/(\d+)\/merge$/))) {
      if (mergeRefused) return reply(405, { message: mergeRefused });
      const pr = pulls.get(+m[1])!;
      if (body.sha !== pr.head.sha) return reply(409, { message: "Head branch was modified. Review and try the merge again." });
      const made = merges.get(pr.number)!;
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
    if (method === "GET" && (m = p.match(/^\/actions\/runs\/(\d+)\/jobs$/))) return reply(200, { jobs: jobs.get(+m[1]) ?? [] });
    if (method === "POST" && p.match(/^\/actions\/workflows\/[\w.]+\/dispatches$/)) return reply(204);
    if (method === "POST" && p.match(/^\/actions\/runs\/\d+\/rerun-failed-jobs$/)) return reply(201, {});
    if (method === "GET" && (m = p.match(/^\/actions\/jobs\/(\d+)\/logs$/))) return reply(302, undefined, { location: `https://logs.github.test/${m[1]}` });
    return reply(404, { message: `no route ${method} ${p}` });
  }) as typeof globalThis.fetch;
  return {
    pulls, checks, runs, jobs, logs, calls, merges,
    refuseMerge: (why: string | null) => (mergeRefused = why),
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
