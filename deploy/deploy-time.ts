// How long the newest deploy took from its merge into main to play.maia.city answering with it (intent 5ab64b8e),
// read from GitHub's API: production's head, the time its pull request was merged (else the commit's own time), and
// the end of production.yml's run on it (its jobs' last step finished), waited for while it runs.
//
//   bun deploy/deploy-time.ts [--repo owner/name] [--most <seconds>]
//
// Prints the seconds and each job's span; with --most, exits 1 when it took longer. GH_TOKEN (or GITHUB_TOKEN) is sent
// to api.github.com when set (a private repository); nothing else is.
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const REPO = opt("--repo") ?? process.env.GITHUB_REPOSITORY ?? "myavenceo/maiacity";
const MOST = opt("--most") === undefined ? null : Number(opt("--most"));
const API = process.env.GITHUB_API_URL ?? "https://api.github.com";
const TOKEN = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

async function get<T = any>(path: string): Promise<T> {
  const r = await fetch(`${API}/repos/${REPO}/${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "maiacity-deploy-time", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
  });
  if (!r.ok) throw new Error(`GitHub answered ${r.status} for ${path}`);
  return (await r.json()) as T;
}

const sha: string = (await get("branches/production")).commit.sha;
const pulls: any[] = await get(`commits/${sha}/pulls`);
const pull = pulls.find((p) => p.merged_at && p.merge_commit_sha === sha);
const merged = Date.parse(pull?.merged_at ?? (await get(`commits/${sha}`)).commit.committer.date);
console.log(`production at ${sha.slice(0, 7)}${pull ? ` (#${pull.number})` : ""}, merged ${new Date(merged).toISOString()}`);

let run: any;
for (let i = 0; ; i++) {
  const runs: any[] = (await get(`actions/workflows/production.yml/runs?head_sha=${sha}&per_page=20`)).workflow_runs;
  run = runs.sort((a, b) => b.id - a.id)[0];
  if (run?.status === "completed") break;
  if (i >= 90) throw new Error(`production.yml on ${sha.slice(0, 7)} did not finish in 15 minutes`);
  console.log(run ? `production.yml run ${run.id} is ${run.status}…` : `no production.yml run on ${sha.slice(0, 7)} yet…`);
  await Bun.sleep(10_000);
}
if (run.conclusion !== "success") {
  console.error(`production.yml run ${run.id} on ${sha.slice(0, 7)} is ${run.conclusion}: ${run.html_url}`);
  process.exit(1);
}
const jobs: any[] = (await get(`actions/runs/${run.id}/jobs?per_page=100`)).jobs;
const ends = jobs.map((j) => Date.parse(j.completed_at)).filter(Number.isFinite);
const live = Math.max(...ends);
for (const j of jobs.sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at)))
  console.log(`  ${j.name}: ${Math.round((Date.parse(j.started_at) - merged) / 1000)}–${Math.round((Date.parse(j.completed_at) - merged) / 1000)} s`);
const s = Math.round((live - merged) / 1000);
console.log(`merge → live: ${s} s (${run.html_url})`);
if (MOST !== null && !(s <= MOST)) {
  console.error(`over ${MOST} s`);
  process.exit(1);
}
