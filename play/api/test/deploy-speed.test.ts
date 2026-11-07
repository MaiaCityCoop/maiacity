// Merge to live in at most 90 s (intent 5ab64b8e-f0b6-4688-9621-b38b0e665585), every gate kept. What makes the deploy
// fast and what keeps it safe, each as a test: the import's no-op run asks play's store nothing (against a real Postgres,
// TEST_DATABASE_URL, and a store that counts its calls); release.yml fetches no file contents; production.yml has no job
// that only waits, its jobs start together and the server waits for the image and the backup; main's checks on a push
// pass without running again only on the very tree a pull request's run tested (tested-tree.sh against a stand-in
// GitHub); every gate of before is kept; play's Ship follows the jobs as they are; play-api stops on SIGTERM.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore, type BlobStore } from "../src/blobs";
import { hashText } from "../src/hash";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { RECIPE_HEAD } from "../src/recipes";
import { STEPS } from "../src/ship";
import { mediaNamed, runImport } from "../import/run";

const ROOT = resolve(import.meta.dir, "../../..");
const text = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const yaml = (path: string) => Bun.YAML.parse(text(path)) as any;
const URL_ = process.env.TEST_DATABASE_URL;
const pg = URL_ ? describe : describe.skip;

/** a fresh database of its own, migrated */
async function freshDb(): Promise<{ db: Db; url: string; drop: () => Promise<void> }> {
  const name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = new Bun.SQL(URL_!);
  await admin.unsafe(`CREATE DATABASE ${name}`);
  const u = new URL(URL_!);
  u.pathname = `/${name}`;
  const sql = new Bun.SQL(u.toString());
  const db = fromBunSql(sql);
  await migrate(db);
  return {
    db,
    url: u.toString(),
    drop: async () => {
      await sql.close();
      await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.close();
    },
  };
}

/** a store that counts every call made of it, and what it was asked about */
function counting(inner: BlobStore) {
  const calls: string[] = [];
  const store: BlobStore = {
    has: (h) => (calls.push(`has ${h}`), inner.has(h)),
    size: (h) => (calls.push(`size ${h}`), inner.size(h)),
    put: (h, b, t) => (calls.push(`put ${h}`), inner.put(h, b, t)),
    get: (h) => (calls.push(`get ${h}`), inner.get(h)),
    url: (h, s) => (calls.push(`url ${h}`), inner.url(h, s)),
  };
  return { store, calls };
}

const recipe = (id: string, v: number) => `${RECIPE_HEAD}module.exports.recipe = () => ({});\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, null);\n});\n`;
const COOP = "12f8d4e7-701f-8727-a327-de9b240ea867";

pg("the deploy's import", () => {
  let t: Awaited<ReturnType<typeof freshDb>>;
  beforeAll(async () => {
    t = await freshDb();
  });
  afterAll(async () => {
    await t?.drop();
  });

  test("a no-op import asks the store nothing; a cleared source is attached again; a mislabelled recipe is refused", async () => {
    const { db } = t;
    const { store, calls } = counting(folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))));
    // an imported version, as the legacy import left it: its recipe file among play's files, its source in the index
    const put = async (body: string) => {
      const h = hashText(body);
      const key = await store.put(h, new TextEncoder().encode(body), "text/javascript");
      await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, 'text/javascript', $3)`, [h, body.length, key]);
      return h;
    };
    const mint = await put(recipe("mint-old", 1));
    const mintId = "8a1e2b44-0000-4000-8000-0000000000a1";
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'mint-old', 'Mint')`, [mintId, COOP]);
    await db.query(`INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, default_variant, card, engine, imported) VALUES ($1, $2, 1, $3, NULL, '{"card":{}}', 5, '{"from":"legacy"}')`, [hashText("mint-old@1"), mintId, mint]);
    const source = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v }, build: () => null };\n};\n";
    const src = hashText(source);
    const dir = mkdtempSync(join(tmpdir(), "play-sources-"));
    mkdirSync(join(dir, "plants"));
    writeFileSync(join(dir, "plants/mint.js"), source);
    const index = (recipes: Record<string, unknown>) => writeFileSync(join(dir, "index.json"), JSON.stringify({ sources: { [src]: "plants/mint.js" }, recipes }));
    index({ [mint]: { asset: "plants/mint-old", v: 1, variant: null, source: src, commit: "c" } });
    // the legacy import ran; the media play's site names are among play's files (their rows: play keeps a file first)
    await db.query(`INSERT INTO play.imports (name) VALUES ('legacy')`);
    for (const m of mediaNamed()) await db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, 1, 'image/jpeg', $2) ON CONFLICT DO NOTHING`, [m.hash, `blobs/${m.hash.slice(0, 2)}/${m.hash}`]);
    const run = () => runImport(db, store, { sources: dir, log: () => {} });

    // the first run gives the version its source, seeds the repo's stories and makes the documents
    const first = await run();
    expect(first.ok).toBe(true);
    expect(first.sources).toMatchObject({ attached: 1, errors: [] });
    expect(calls.length).toBeGreaterThan(0);

    // a second run, nothing missing: not one call to the store, whatever the number of files
    calls.length = 0;
    const second = await run();
    expect(second.ok).toBe(true);
    expect(second.legacy.ran).toBeString();
    expect(second.sources).toMatchObject({ files: 0, attached: 0, errors: [] });
    expect(calls).toEqual([]);

    // a version whose source was cleared gets it again: its recipe's label read and checked first, and only that asked
    await db.transaction(async (q) => {
      await q.query(`SET LOCAL session_replication_role = replica`); // past the trigger that sets a source once
      await q.query(`UPDATE play.asset_versions SET source_hash = NULL WHERE asset_id = $1`, [mintId]);
    });
    calls.length = 0;
    const third = await run();
    expect(third.ok).toBe(true);
    expect(third.sources.attached).toBe(1);
    expect(calls[0]).toBe(`get ${mint}`);
    expect(calls.every((c) => c.endsWith(mint) || c.endsWith(src))).toBe(true);
    expect((await db.query(`SELECT source_hash FROM play.asset_versions WHERE asset_id = $1`, [mintId])).rows[0].source_hash).toBe(src);

    // a recipe file that builds another version than the index says: refused, its version left without a source
    const sage = await put(recipe("sage-old", 1));
    const sageId = "8a1e2b44-0000-4000-8000-0000000000a2";
    await db.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, 'plants', 'sage-old', 'Sage')`, [sageId, COOP]);
    await db.query(`INSERT INTO play.asset_versions (id, asset_id, number, recipe_hash, default_variant, card, engine, imported) VALUES ($1, $2, 1, $3, NULL, '{"card":{}}', 5, '{"from":"legacy"}')`, [hashText("sage-old@1"), sageId, sage]);
    index({ [mint]: { asset: "plants/mint-old", v: 1, variant: null, source: src, commit: "c" }, [sage]: { asset: "plants/sage-old", v: 2, variant: null, source: src, commit: "c" } });
    const fourth = await run();
    expect(fourth.ok).toBe(false);
    expect(fourth.sources.errors).toEqual([expect.stringMatching(/builds sage-old@1, not plants\/sage-old@2/)]);
    expect((await db.query(`SELECT source_hash FROM play.asset_versions WHERE asset_id = $1`, [sageId])).rows[0].source_hash).toBeNull();
  }, 60_000);
});

pg("a media file play's files lack", () => {
  test("is an import error naming its hash: no feed is asked, play mends its files from its second copy", async () => {
    const t = await freshDb();
    try {
      const { store, calls } = counting(folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))));
      const own = (m: { hash: string; ending: string }) => Bun.file(resolve(ROOT, "play/media", `${m.hash}.${m.ending}`)).exists();
      const named = mediaNamed();
      let lost: { hash: string; ending: string } | undefined;
      for (const m of named) if (!lost && !(await own(m))) lost = m;
      expect(lost).toBeDefined();
      // every other one among play's files already
      for (const m of named.filter((x) => x !== lost)) await t.db.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, 1, 'image/jpeg', $2)`, [m.hash, `blobs/${m.hash.slice(0, 2)}/${m.hash}`]);
      const fetched: string[] = [];
      const real = globalThis.fetch;
      globalThis.fetch = (async (u: any) => (fetched.push(String(u)), new Response("", { status: 599 }))) as typeof fetch;
      let report;
      try {
        report = await runImport(t.db, store, { log: () => {} });
      } finally {
        globalThis.fetch = real;
      }
      expect(report.ok).toBe(false);
      expect(report.verified.mediaErrors).toEqual([expect.stringContaining(`media ${lost!.hash}.${lost!.ending}: not among play's files`)]);
      expect(fetched).toEqual([]);
      expect(calls.filter((c) => c.startsWith("put ") && c.endsWith(lost!.hash))).toEqual([]);
    } finally {
      await t.drop();
    }
  }, 60_000);
});

describe("the workflows", () => {
  const prod = () => yaml(".github/workflows/production.yml");
  const GATE = "./.github/actions/main-green";

  test("release checks out no blobs, and moves production as before", () => {
    const steps = yaml(".github/workflows/release.yml").jobs.release.steps as any[];
    expect(steps[0].uses).toBe("actions/checkout@v4");
    expect(steps[0].with.filter).toBe("blob:none");
    // the work tree only the workflow itself: no other file's contents fetched
    expect(steps[0].with["sparse-checkout"]).toBe(".github/workflows/release.yml");
    expect(steps[0].with["sparse-checkout-cone-mode"]).toBe(false);
    const move = steps.find((s) => s.name === "production moves to the commit, fast-forward only");
    for (const line of [
      `git fetch -q origin main production`,
      `git merge-base --is-ancestor "$SHA" origin/main`,
      `elif git merge-base --is-ancestor "$SHA" "$PROD"; then`,
      `elif git merge-base --is-ancestor "$PROD" "$SHA"; then`,
      `git push origin "$SHA:refs/heads/production"`,
    ])
      expect(move.run).toContain(line);
    expect(move.run).not.toContain("--force");
  });

  test("no job only waits: no Main is green, no Only from main, no pull_request; every job reads main's checks first", () => {
    const p = prod();
    expect(Object.keys(p.on).sort()).toEqual(["push", "workflow_dispatch"]);
    expect(p.on.push).toEqual({ branches: ["production"] });
    const names = Object.values(p.jobs).map((j: any) => j.name);
    expect(names).not.toContain("Main is green");
    expect(names).not.toContain("Only from main");
    expect(text(".github/workflows/production.yml")).not.toContain("pull_request");
    for (const [key, job] of Object.entries(p.jobs) as [string, any][]) {
      // the shared action is a file of the repository: the checkout, then at once the reading of main's checks
      expect([key, job.steps[0].uses]).toEqual([key, "actions/checkout@v4"]);
      expect([key, job.steps[1].uses]).toEqual([key, GATE]);
      expect(job.steps[0].with?.ref).toBeUndefined();
      // no job is only the reading: each does its own work after it
      expect(job.steps.length).toBeGreaterThan(2);
    }
    expect(p.concurrency).toEqual({ group: "production-release", "cancel-in-progress": false });
  });

  test("backup before any change: the image, the backup and the website start together; the server needs the image and the backup", () => {
    const p = prod();
    expect(p.jobs.image.needs).toBeUndefined();
    expect(p.jobs.backup.needs).toBeUndefined();
    expect(p.jobs.website.needs).toBeUndefined();
    expect([...p.jobs.server.needs].sort()).toEqual(["backup", "image"]);
    // the backup's job: the files over one connection, then deploy/backup.sh; nothing else on the server
    const b = p.jobs.backup.steps.map((s: any) => s.name ?? s.uses);
    expect(b).toEqual(["actions/checkout@v4", GATE, "./.github/actions/prod-ssh", "Copy play's files", "Back up play"]);
    const copy = p.jobs.backup.steps.find((s: any) => s.name === "Copy play's files").run;
    expect(copy).toContain(`| ssh prod "mkdir -p $APP_DIR && tar -xf - --no-same-owner -C $APP_DIR"`);
    for (const f of ["play/docker-compose.play.yml", "play/deploy/setup.sql", "play/deploy/after-import.sql", "play/deploy/Caddyfile.play", "deploy/backup.sh", "deploy/restore.sh"]) expect(copy).toContain(f);
    expect(copy.match(/\bssh\b/g)).toHaveLength(1);
    const backup = p.jobs.backup.steps.find((s: any) => s.name === "Back up play").run;
    expect(backup).toContain("bash $APP_DIR/deploy/backup.sh before-deploy-${GITHUB_SHA::7} $GITHUB_SHA");
    // the server changes nothing itself before it runs play: no backup and no copy of its own
    const server = p.jobs.server.steps.map((s: any) => s.name ?? s.uses);
    expect(server).not.toContain("Back up play");
    expect(server).not.toContain("Copy play's files");
    // nothing goes on past a failure
    expect(text(".github/workflows/production.yml")).not.toContain("continue-on-error");
    expect(text(".github/actions/main-green/action.yml")).not.toContain("continue-on-error");
  });

  test("checks named as before: play / API and site, website / build; full on every pull request; Postgres only when they run", () => {
    const main = yaml(".github/workflows/main.yml");
    expect(main.jobs.play.uses).toBe("./.github/workflows/play-checks.yml");
    expect(main.jobs.website.uses).toBe("./.github/workflows/website-checks.yml");
    expect([main.jobs.play.name, main.jobs.website.name]).toEqual(["play", "website"]);
    expect(main.permissions).toEqual({ contents: "read", actions: "read", checks: "read", "pull-requests": "read" });
    const play = yaml(".github/workflows/play-checks.yml").jobs.checks;
    const site = yaml(".github/workflows/website-checks.yml").jobs.build;
    expect([play.name, site.name]).toEqual(["API and site", "build"]);
    for (const [job, check] of [[play, "play / API and site"], [site, "website / build"]] as [any, string][]) {
      expect(job.services).toBeUndefined();
      const tested = job.steps.find((s: any) => s.id === "tested");
      // only on a push to main may the tested tree skip: on a pull request the step does not run, so nothing skips
      expect(tested.if).toBe("github.event_name == 'push'");
      expect(tested.env.CHECK).toBe(check);
      expect(tested.run).toBe("bash .github/workflows/tested-tree.sh");
      // every step after it runs unless it said the very tree passed
      for (const s of job.steps.slice(job.steps.indexOf(tested) + 1)) expect(s.if).toBe("steps.tested.outputs.skip != 'true'");
      // a run that tested ends by naming its tree
      expect(job.steps.at(-1).run).toBe(`echo "::notice title=Tested tree::$(git rev-parse 'HEAD^{tree}')"`);
    }
    const pgStep = play.steps.find((s: any) => s.name === "Postgres");
    expect(pgStep.run).toContain("postgres:17-alpine");
    expect(play.steps.find((s: any) => s.name === "The API").run).toContain("bun test");
  });

  test("every gate kept", () => {
    // the shared action: both checks concluded success on the commit, or the job stops
    const green = yaml(".github/actions/main-green/action.yml");
    expect(green.inputs.checks.default).toBe("play / API and site|website / build");
    const run = green.runs.steps[0].run as string;
    expect(run).toContain(`select(.conclusion == "success")`);
    expect(run).toContain(`for check in "\${all[@]}"; do passed "$check" || exit 1; done`);
    for (const job of Object.values(prod().jobs) as any[]) expect(job.steps[1].with).toEqual({ token: "${{ github.token }}", sha: "${{ github.sha }}" });
    // release.yml: fast-forward only, with GITHUB_TOKEN, no secret
    const release = text(".github/workflows/release.yml");
    expect(release).not.toContain("secrets.");
    expect(release).not.toMatch(/push[^\n]*(--force|\s-f\b|\+)/);
    // the jobs that reach the server: environment production and the pinned host keys
    const ssh = text(".github/actions/prod-ssh/action.yml");
    expect(ssh).toContain("StrictHostKeyChecking yes");
    expect(ssh).toContain("UserKnownHostsFile ~/.ssh/known_hosts");
    for (const [key, job] of Object.entries(prod().jobs) as [string, any][]) {
      const reaches = job.steps.some((s: any) => s.uses === "./.github/actions/prod-ssh");
      if (reaches) expect([key, job.environment]).toEqual([key, "production"]);
      for (const s of job.steps) expect(`${s.run ?? ""}`).not.toMatch(/StrictHostKeyChecking=?\s*no|-o\s*UserKnownHostsFile=\/dev\/null/);
    }
    expect(Object.keys(prod().jobs).filter((k) => prod().jobs[k].steps.some((s: any) => s.uses === "./.github/actions/prod-ssh")).sort()).toEqual(["backup", "server", "website"]);
    // no secret is read that was not read before
    const secrets = (path: string) => [...new Set([...text(path).matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]))].sort();
    const before = ["DEPLOY_KNOWN_HOSTS", "DEPLOY_SSH_KEY", "GITHUB_TOKEN", "HETZNER_API_KEY", "HETZNER_DNS_TOKEN", "HETZNER_S3_ACCESS_KEY", "HETZNER_S3_SECRET_KEY", "SHIP_TOKEN"];
    for (const s of secrets(".github/workflows/production.yml")) expect(before).toContain(s);
    for (const f of [".github/workflows/main.yml", ".github/workflows/play-checks.yml", ".github/workflows/website-checks.yml", ".github/workflows/tested-tree.sh", ".github/actions/main-green/action.yml"]) expect([f, secrets(f)]).toEqual([f, []]);
  });

  test("Ship follows the jobs: its steps name only jobs and steps production.yml has, in order, the backup its own job", () => {
    const jobs = Object.values(prod().jobs) as any[];
    const deploy = STEPS.filter((s) => s.job);
    expect(deploy.map((s) => s.job)).toEqual(jobs.map((j) => j.name));
    for (const s of deploy) {
      const job = jobs.find((j) => j.name === s.job);
      if (s.step) expect(job.steps.map((x: any) => x.name)).toContain(s.step);
    }
    expect(STEPS.find((s) => s.key === "backup")).toEqual({ key: "backup", name: "Backup", job: "The backup" });
    expect(STEPS.map((s) => s.name)).not.toContain("Main is green");
    expect(STEPS.map((s) => s.key)).toEqual(["ready", "merged", "main", "release", "image", "backup", "server", "website"]);
  });
});

describe("tested tree", () => {
  const SCRIPT = resolve(ROOT, ".github/workflows/tested-tree.sh");
  const REPO = "maia/city";
  const SHA = "a".repeat(40), HEAD = "b".repeat(40), TREE = "c".repeat(40), OTHER = "d".repeat(40);
  const CHECK = "play / API and site";
  type World = { tree?: string; pulls?: any[]; runs?: any[]; jobs?: Record<number, any[]>; notes?: Record<number, any[]>; fail?: string };
  let world: World = {};
  let server: ReturnType<typeof Bun.serve>;
  beforeAll(() => {
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const u = new URL(req.url);
        const p = u.pathname.replace(`/repos/${REPO}/`, "");
        if (req.headers.get("authorization") !== "Bearer t0ken") return new Response("no", { status: 401 });
        if (world.fail && p.startsWith(world.fail)) return new Response("down", { status: 500 });
        if (p === `git/commits/${SHA}`) return Response.json({ sha: SHA, tree: { sha: world.tree ?? TREE } });
        if (p === `commits/${SHA}/pulls`) return Response.json(world.pulls ?? []);
        if (p === "actions/runs") {
          expect(u.searchParams.get("head_sha")).toBe(HEAD);
          expect(u.searchParams.get("event")).toBe("pull_request");
          return Response.json({ workflow_runs: world.runs ?? [] });
        }
        let m = /^actions\/runs\/(\d+)\/jobs$/.exec(p);
        if (m) return Response.json({ jobs: world.jobs?.[Number(m[1])] ?? [] });
        m = /^check-runs\/(\d+)\/annotations$/.exec(p);
        if (m) return Response.json(world.notes?.[Number(m[1])] ?? []);
        return new Response("not found", { status: 404 });
      },
    });
  });
  afterAll(() => server?.stop(true));

  const pull = { number: 7, merged_at: "2026-11-06T16:51:42Z", merge_commit_sha: SHA, head: { sha: HEAD } };
  const prRun = (id: number, more: any = {}) => ({ id, path: ".github/workflows/main.yml", event: "pull_request", status: "completed", conclusion: "success", repository: { full_name: "Maia/City" }, ...more });
  const passed = (id: number, name = CHECK) => ({ id, name, status: "completed", conclusion: "success" });
  const note = (tree: string) => [{ annotation_level: "notice", title: "Tested tree", message: tree }];
  /** the world where #7 merged as SHA and its run 11 tested TREE in job 21 */
  const tested = (): World => ({ pulls: [pull], runs: [prRun(11)], jobs: { 11: [passed(21), passed(22, "website / build")] }, notes: { 21: note(TREE), 22: note(OTHER) } });

  const decide = async (w: World, env: Record<string, string> = {}) => {
    world = w;
    const out = join(mkdtempSync(join(tmpdir(), "tested-")), "out");
    writeFileSync(out, "");
    const p = Bun.spawn(["bash", SCRIPT], {
      env: { PATH: process.env.PATH!, GITHUB_API_URL: `http://127.0.0.1:${server.port}`, GITHUB_OUTPUT: out, GH_TOKEN: "t0ken", EVENT: "push", REPO, SHA, CHECK, ...env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const said = await new Response(p.stdout).text();
    expect(await p.exited).toBe(0); // it never fails the job itself
    return { skip: readFileSync(out, "utf8").trim(), said };
  };

  test("tested tree: the pushed tree is the tree the merged pull request's run tested: the checks pass without running", async () => {
    const r = await decide(tested());
    expect(r.skip).toBe("skip=true");
    expect(r.said).toContain("not run again");
  });

  test("tested tree: a different tree, a failed, cancelled or other workflow's run, another repository, no pull request, an API error: the checks run", async () => {
    const cases: [string, World, Record<string, string>?][] = [
      ["another tree pushed", { ...tested(), tree: OTHER }],
      ["the website's job tested another tree", tested(), { CHECK: "website / build" }],
      ["the run failed", { ...tested(), runs: [prRun(11, { conclusion: "failure" })] }],
      ["the run was cancelled", { ...tested(), runs: [prRun(11, { conclusion: "cancelled" })] }],
      ["the run is still going", { ...tested(), runs: [prRun(11, { status: "in_progress", conclusion: null })] }],
      ["another workflow's run", { ...tested(), runs: [prRun(11, { path: ".github/workflows/other.yml" })] }],
      ["a run of another repository", { ...tested(), runs: [prRun(11, { repository: { full_name: "fork/city" } })] }],
      ["the job failed", { ...tested(), jobs: { 11: [{ ...passed(21), conclusion: "failure" }] } }],
      ["no notice of the tree", { ...tested(), notes: {} }],
      ["no pull request", { ...tested(), pulls: [] }],
      ["a pull request not merged as this commit", { ...tested(), pulls: [{ ...pull, merge_commit_sha: OTHER }] }],
      ["an open pull request", { ...tested(), pulls: [{ ...pull, merged_at: null }] }],
      ["GitHub's API errs on the runs", { ...tested(), fail: "actions/runs" }],
      ["GitHub's API errs on the commit", { ...tested(), fail: "git/commits" }],
      ["GitHub's API errs on the annotations", { ...tested(), fail: "check-runs" }],
      ["a wrong token", tested(), { GH_TOKEN: "nope" }],
      ["not a push", tested(), { EVENT: "pull_request" }],
      ["no commit", tested(), { SHA: "" }],
    ];
    for (const [why, w, env] of cases) {
      const r = await decide(w, env);
      expect([why, r.skip]).toEqual([why, "skip=false"]);
    }
    // the newest passed run decides: an older one that tested this tree does not, once a newer one tested another
    const newer = { ...tested(), runs: [prRun(11), prRun(12)], jobs: { 11: [passed(21)], 12: [passed(31)] }, notes: { 21: note(TREE), 31: note(OTHER) } };
    expect((await decide(newer)).skip).toBe("skip=false");
  }, 120_000);
});

pg("play-api", () => {
  let t: Awaited<ReturnType<typeof freshDb>>;
  beforeAll(async () => {
    t = await freshDb();
  });
  afterAll(async () => {
    await t?.drop();
  });

  test("stops on SIGTERM: the request in flight answered, no new one taken, exit 0 within 2 s", async () => {
    const { db } = t;
    // the session secret in the database first, so this process and play-api sign alike
    await initSessions(db);
    const h = await createHuman(db, "sig");
    const cookie = `play_session=${tokenFor(h.id)}`;
    // port 0: the server takes a free one and names it ("play-api on :<port>"), so no other test or worker holds it.
    // Its output is read as it comes (a pipe left unread fills and stops the child) and waited on: the test goes on
    // when the server says it listens, and fails at once with its own error if it exits (intent aa59f248: under
    // parallel tests it died with "too many clients", and the test only saw it never answer)
    const api = Bun.spawn(["bun", "src/index.ts"], {
      cwd: resolve(import.meta.dir, ".."),
      env: { PATH: process.env.PATH!, HOME: process.env.HOME ?? "/tmp", DATABASE_URL: t.url, PORT: "0", PLAY_BLOBS: mkdtempSync(join(tmpdir(), "play-blobs-")) },
      stdout: "pipe",
      stderr: "pipe",
    });
    const out: string[] = [];
    const err: string[] = [];
    const drain = async (s: ReadableStream<Uint8Array>, into: string[]) => {
      const d = new TextDecoder();
      for await (const c of s) into.push(d.decode(c, { stream: true }));
    };
    const outDone = drain(api.stdout, out);
    void drain(api.stderr, err);
    // until `ok` holds on what it said, or it exits
    const said = async <T,>(ok: (text: string) => T | null): Promise<T> => {
      for (;;) {
        const hit = ok(out.join(""));
        if (hit !== null) return hit;
        if (api.exitCode !== null) throw new Error(`play-api exited (${api.exitCode}): ${err.join("")}${out.join("")}`);
        await Bun.sleep(20);
      }
    };
    try {
      const port = await said((o) => o.match(/play-api on :(\d+)/)?.[1] ?? null);
      const base = `http://127.0.0.1:${port}`;
      expect((await fetch(`${base}/api/health`)).ok).toBe(true);
      // a slow request: /api/me waits on play.humans, held locked here
      const admin = new Bun.SQL(t.url, { max: 1 });
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      let locked!: () => void;
      const isLocked = new Promise<void>((r) => (locked = r));
      const lock = admin.begin(async (tx) => {
        await tx.unsafe(`LOCK TABLE play.humans IN ACCESS EXCLUSIVE MODE`);
        locked();
        await held;
      });
      await isLocked;
      const slow = fetch(`${base}/api/me`, { headers: { cookie } });
      // in flight: its query waits on the lock in Postgres
      for (;;) {
        const { rows } = await db.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`,
        );
        if (rows[0].n > 0) break;
        await Bun.sleep(20);
      }
      const t0 = performance.now();
      api.kill("SIGTERM");
      // stopping: its listener closed as it says so
      await said((o) => (o.includes("SIGTERM: stopping") ? true : null));
      // no new connection taken
      const late = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(500) }).then((r) => `answered ${r.status}`, () => "refused");
      expect(late).toBe("refused");
      release();
      await lock;
      await admin.close();
      // the request in flight is answered
      const r = await slow;
      expect(r.status).toBe(200);
      expect((await r.json()).name).toBe("sig");
      const code = await Promise.race([api.exited, Bun.sleep(2500).then(() => "still running")]);
      expect(code).toBe(0);
      expect(performance.now() - t0).toBeLessThan(2000);
      await outDone;
      expect(out.join("")).toContain("SIGTERM: stopping");
    } finally {
      api.kill("SIGKILL");
      await api.exited;
    }
  }, 30_000);
});
