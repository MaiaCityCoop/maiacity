// Delivery measured and budgeted (src/delivery.ts; intent 2f19fe30-5490-4ad6-8ea4-9211e06770c5): where an intent's time
// goes, read from what play keeps on it, against a real Postgres (TEST_DATABASE_URL) and a fake GitHub
// (./fixtures/github.ts): the time at each stage (an agent's, a person's, CI's) and each ship step's, each day's
// numbers, CI minutes and each run's slowest steps, play's main merges counted, the budgets, and who may read it.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { seedSkills } from "../import/skills";
import { COOP } from "../src/access";
import { app } from "../src/app";
import { createHuman, initSessions, tokenFor } from "../src/auth";
import { folderStore } from "../src/blobs";
import { BUDGETS, daysOf, delivery, NO_GITHUB } from "../src/delivery";
import { Rate } from "../src/limits";
import { carrySeen, mainMergeState } from "../src/mainmerge";
import { migrate } from "../src/migrations";
import { fromBunSql, type Db } from "../src/pg";
import { watchTick } from "../src/ship";
import { newId } from "../src/uuid";
import { fakeGitHub, job, REPO, run, sha } from "./fixtures/github";

const URL_ = process.env.TEST_DATABASE_URL;
const suite = URL_ ? describe : describe.skip;

const MIN = 60_000;
const NOW = Date.parse("2026-11-07T18:00:00Z");
/** a time on the day `d` days before NOW's, at `hm` (UTC) */
const at = (hm: string, d = 0) => new Date(Date.parse(`2026-11-07T${hm}:00Z`) - d * 86_400_000).toISOString();
const SPEC = { goal: "g", scope: "s", checks: [{ id: "c1", check: "it works", how: "test", by: "bun test", run: "bun test", must: true }, { id: "c2", check: "nice", how: "look", by: "a look", must: false }] };
const res = (t: string, more: Record<string, unknown> = {}) => ({ pass: true, evidence: "0 fail", by: "ada", at: t, ...more });
const step = (key: string, a: string, b?: string, state = "green") => ({ key, name: key, state, started: a, ...(b ? { finished: b } : {}) });

suite("delivery", () => {
  let admin: Bun.SQL, sql: Bun.SQL, db: Db, name: string;
  let api: ReturnType<typeof app>;
  let gh: ReturnType<typeof fakeGitHub>;
  let ada = "", cookie = "", travelerCookie = "", token = "";

  beforeAll(async () => {
    name = `play_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    admin = new Bun.SQL(URL_!);
    await admin.unsafe(`CREATE DATABASE ${name}`);
    const u = new URL(URL_!);
    u.pathname = `/${name}`;
    sql = new Bun.SQL(u.toString());
    db = fromBunSql(sql);
    await migrate(db);
    await initSessions(db);
    await seedSkills(db);
    gh = fakeGitHub();
    api = app({ db, store: folderStore(mkdtempSync(join(tmpdir(), "play-blobs-"))), rate: new Rate(0), github: gh.gh });
    const h = await createHuman(db, "ada");
    ada = h.id;
    cookie = `play_session=${tokenFor(h.id)}`;
    await db.query(`UPDATE play.memberships SET level = 'admin' WHERE human_id = $1`, [h.id]);
    const t = await createHuman(db, "tom");
    travelerCookie = `play_session=${tokenFor(t.id)}`;
    const made = (await call("POST", "/api/tokens", { name: "agent" })).data;
    token = made.token;
  });

  afterAll(async () => {
    await sql?.close();
    await admin?.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin?.close();
  });

  beforeEach(async () => {
    await db.query(`DELETE FROM play.intents`);
    gh.pulls.clear();
    gh.branchRuns.clear();
    for (const k of Object.keys(gh.runs)) gh.runs[k] = [];
    gh.jobs.clear();
  });

  async function call(method: string, path: string, body?: unknown, c = cookie) {
    const headers: Record<string, string> = c ? { cookie: c } : {};
    if (body !== undefined) headers["content-type"] = "application/json";
    const r = await api.fetch(new Request(`http://play.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
    return { status: r.status, data: await r.json().catch(() => null) };
  }
  let n = 0;
  const rpc = async (method: string, params: unknown) => {
    const r = await api.fetch(
      new Request("http://play.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }),
      }),
    );
    return r.json();
  };

  /** an intent as play keeps it, its times and records as given */
  async function intent(f: Record<string, unknown>) {
    const id = newId();
    await db.query(`INSERT INTO play.intents (id, coop_id, kind, title, note, stage, author, via) VALUES ($1, $2, 'improve', $3, '', 'idea', $4, 'mcp')`, [id, COOP, f.title ?? "an intent", ada]);
    await db.query(
      `UPDATE play.intents SET stage = $2, created = $3, spec = ($4::text)::jsonb, specified_at = $5, approved_at = $6, results = ($7::text)::jsonb, decided_at = $8,
              ship = ($9::text)::jsonb, steps = ($10::text)::jsonb, pr_seen = ($11::text)::jsonb, pull_request = $12 WHERE id = $1`,
      [
        id, f.stage, f.created, f.specified_at ? JSON.stringify(SPEC) : null, f.specified_at ?? null, f.approved_at ?? null, f.results ? JSON.stringify(f.results) : null,
        f.decided_at ?? null, f.ship ? JSON.stringify(f.ship) : null, JSON.stringify(f.steps ?? []), f.pr_seen ? JSON.stringify(f.pr_seen) : null, f.pull_request ?? null,
      ],
    );
    return id;
  }
  const me = { id: "", level: "admin" } as any;
  const read = (o: { days?: unknown; ci?: unknown } = {}, g: any = gh.gh) => delivery(db, { ...me, id: ada }, g, { ...o, now: NOW });
  const of = (d: Awaited<ReturnType<typeof read>>, id: string) => d.intents.find((t) => t.id === id)!;

  /** shipped through every step: Idea 20 min, Specify 30, Build 50, Proposal 20, Ship 15 */
  const shipped = (more: Record<string, unknown> = {}) =>
    intent({
      title: "shipped", stage: "accepted", created: at("10:00"), specified_at: at("10:20"), approved_at: at("10:50"),
      results: { c1: res(at("11:40"), { where: "avenBOX" }), c2: res(at("11:45")), c1m: res(at("13:00"), { where: "main" }) },
      decided_at: at("12:00"),
      ship: {
        ended: at("12:15"),
        steps: [step("ready", at("12:00"), at("12:05")), step("merged", at("12:05"), at("12:05")), step("main", at("12:05"), at("12:09")), step("release", at("12:09"), at("12:10")), step("image", at("12:10"), at("12:13")), step("backup", at("12:10"), at("12:12")), step("server", at("12:13"), at("12:15")), step("website", at("12:10"), at("12:11"))],
      },
      ...more,
    });

  test("time per stage: each stage's time, an agent's or a person's, every ship step's own, step backs counted, the open stage to now", async () => {
    const a = await shipped();
    const b = await intent({ title: "stepped back", stage: "build", created: at("15:00"), specified_at: at("16:00"), approved_at: at("16:10"), steps: [{ at: at("15:50"), from: "build", to: "specify", reason: "unbuildable" }] });
    const c = await intent({ title: "in build", stage: "build", created: at("17:00"), specified_at: at("17:10"), approved_at: at("17:20") });
    const d = await read();
    const A = of(d, a);
    expect(A.segments.map((s) => [s.stage, s.who, s.ms / MIN])).toEqual([["idea", "agent", 20], ["specify", "person", 30], ["build", "agent", 50], ["proposal", "person", 20], ["ship", "ci", 15]]);
    expect(A.accepted_at).toBe(at("12:15"));
    expect(A.lead_ms).toBe(135 * MIN);
    expect(A.ship!.map((s) => [s.key, s.ms! / MIN])).toEqual([["ready", 5], ["merged", 0], ["main", 4], ["release", 1], ["image", 3], ["backup", 2], ["server", 2], ["website", 1]]);
    expect(A.step_backs).toBe(0);
    const B = of(d, b);
    expect(B.step_backs).toBe(1);
    expect(B.segments.map((s) => [s.stage, s.ms / MIN, s.to])).toEqual([["idea", 60, at("16:00")], ["specify", 10, at("16:10")], ["build", 110, null]]);
    const C = of(d, c);
    expect(C.stage_ms).toEqual({ idea: 10 * MIN, specify: 10 * MIN, build: 40 * MIN });
    expect(C.accepted_at).toBeNull();
    expect(C.lead_ms).toBe(60 * MIN);
  });

  test("per day: each day of the window its intents accepted, their median and longest Idea→Accepted, each stage's median; 7 days unless asked, 1 to 30", async () => {
    // two days ago: two accepted (60 and 120 min), one day ago one (30 min), today the shipped one (135 min)
    const plain = (created: string, decided: string) => intent({ stage: "accepted", created, decided_at: decided });
    await plain(at("09:00", 2), at("10:00", 2));
    await plain(at("09:00", 2), at("11:00", 2));
    await plain(at("12:00", 1), at("12:30", 1));
    await shipped();
    // ten days ago: outside a week
    await plain(at("09:00", 10), at("10:00", 10));
    const d = await read();
    expect(d.days).toBe(7);
    expect(d.per_day.length).toBe(7);
    expect(d.per_day.map((x) => x.accepted)).toEqual([0, 0, 0, 0, 2, 1, 1]);
    const [two, one, today] = d.per_day.slice(4);
    expect(two.day).toBe("2026-11-05");
    expect([two.median_lead_ms! / MIN, two.longest_lead_ms! / MIN]).toEqual([90, 120]);
    expect([one.median_lead_ms! / MIN, one.longest_lead_ms! / MIN]).toEqual([30, 30]);
    expect(today.median_stage_ms).toEqual({ idea: 20 * MIN, specify: 30 * MIN, build: 50 * MIN, proposal: 20 * MIN, ship: 15 * MIN });
    expect(d.intents.length).toBe(4);
    const month = await read({ days: 30 });
    expect(month.per_day.reduce((a, x) => a + x.accepted, 0)).toBe(5);
    expect([daysOf(undefined), daysOf(""), daysOf("x"), daysOf(0), daysOf(3), daysOf(99)]).toEqual([7, 7, 7, 1, 3, 30]);
    expect((await read({ days: 99 })).per_day.length).toBe(30);
  });

  test("budgets: an intent over a budget is flagged with the budget and by how much; one within every budget is not", async () => {
    const ok = await shipped();
    const build = await intent({ stage: "build", created: at("15:00"), specified_at: at("16:00"), approved_at: at("16:10") });
    const spec = await intent({ stage: "specify", created: at("16:30"), specified_at: at("17:15") });
    const accept = await intent({ stage: "proposal", created: at("16:00"), specified_at: at("16:05"), approved_at: at("16:10"), results: { c1: res(at("17:00")) } });
    const ship = await intent({ stage: "accepted", created: at("10:00"), specified_at: at("10:10"), approved_at: at("10:20"), results: { c1: res(at("11:00")) }, decided_at: at("11:10"), ship: { ended: at("11:35"), steps: [] } });
    const lead = await intent({ stage: "accepted", created: at("08:00"), specified_at: at("08:10"), approved_at: at("08:20"), results: { c1: res(at("09:20")) }, decided_at: at("09:40"), ship: { ended: at("09:50"), steps: [] } });
    const d = await read();
    const flags = (id: string) => of(d, id).over.map((o) => [o.budget, o.over_ms / MIN]);
    expect(flags(ok)).toEqual([]);
    expect(flags(build)).toEqual([["build", 20]]);
    expect(flags(spec)).toEqual([["specify", 15]]);
    expect(flags(accept)).toEqual([["proposal", 30]]);
    expect(flags(ship)).toEqual([["ship", 5]]);
    // Idea→Accepted 110 min, Build 60, Proposal 20, Ship 10: within every budget
    expect(flags(lead)).toEqual([]);
    const long = await intent({ stage: "accepted", created: at("06:00"), specified_at: at("06:10"), approved_at: at("06:20"), results: { c1: res(at("07:30")) }, decided_at: at("07:50"), ship: { ended: at("10:00"), steps: [] } });
    expect(of(await read(), long).over.map((o) => [o.budget, o.over_ms / MIN])).toEqual([["ship", 110], ["lead", 60]]);
    expect(d.over).toBe(4);
    expect(BUDGETS.map((b) => [b.key, b.ms / MIN])).toEqual([["specify", 30], ["build", 90], ["proposal", 30], ["ship", 20], ["lead", 180], ["run", 10]]);
  });

  test("CI: an intent's branch runs and its ship's runs, their minutes, the share cancelled, each run's three slowest steps, a run over 10 minutes flagged; without GitHub, unavailable and the rest answers", async () => {
    const id = await shipped({ pull_request: 700, ship: { ended: at("12:15"), steps: [], main_run: 31, release_run: 32 } });
    gh.pulls.set(700, { number: 700, state: "closed", merged: true, merge_commit_sha: sha(1), mergeable: null, base: { ref: "main" }, head: { sha: sha(2), ref: "intent/2f19fe30-x" }, html_url: `https://github.test/${REPO}/pull/700`, title: "x" });
    const span = (a: string, b: string) => ({ status: "completed", run_started_at: at(a), created_at: at(a), updated_at: at(b) });
    gh.branchRuns.set("intent/2f19fe30-x", [run(21, sha(2), { ...span("11:00", "11:12"), conclusion: "success", name: "main" }), run(22, sha(2), { ...span("11:20", "11:22"), conclusion: "cancelled", name: "main" })]);
    gh.runs["main.yml"].push(run(31, sha(1), { ...span("12:05", "12:09"), conclusion: "success" }));
    gh.runs["release.yml"].push(run(32, sha(1), { ...span("12:09", "12:10"), conclusion: "success" }));
    const s = (name: string, a: string, b: string) => ({ name, status: "completed", conclusion: "success", started_at: at(a), completed_at: at(b) });
    gh.jobs.set(21, [job(1, "play / API and site", "completed", "success", [s("checkout", "11:00", "11:01"), s("The API", "11:01", "11:09"), s("The site", "11:09", "11:12")]), job(2, "website / build", "completed", "success", [s("build", "11:00", "11:02"), s("check", "11:02", "11:02")])]);
    const d = await read({ ci: true });
    const ci = of(d, id).ci as any;
    expect(ci.runs).toBe(4);
    expect(ci.minutes).toBe(19);
    expect(ci.cancelled).toBe(1);
    expect(ci.cancelled_share).toBe(0.25);
    const r21 = ci.list.find((r: any) => r.id === 21);
    expect(r21.ms).toBe(12 * MIN);
    expect(r21.over).toBe(true);
    expect(r21.slowest).toEqual([{ job: "play / API and site", step: "The API", ms: 8 * MIN }, { job: "play / API and site", step: "The site", ms: 3 * MIN }, { job: "website / build", step: "build", ms: 2 * MIN }]);
    expect(ci.list.filter((r: any) => r.over).map((r: any) => r.id)).toEqual([21]);
    expect(of(d, id).over.map((o) => [o.budget, o.run, o.over_ms / MIN])).toEqual([["run", 21, 2]]);
    expect(d.ci).toEqual({ available: true, minutes: 19, runs: 4, cancelled_share: 0.25 });
    // without play's GitHub: CI unavailable, the rest as it was
    const none = await read({ ci: true }, null);
    expect(none.ci).toEqual({ available: false, why: NO_GITHUB });
    expect(of(none, id).ci).toBeUndefined();
    expect(of(none, id).lead_ms).toBe(135 * MIN);
    // without `ci`, GitHub is not asked
    const from = gh.calls.length;
    expect((await read()).ci).toBeNull();
    expect(gh.calls.length).toBe(from);
  });

  test("main merges: each update-branch play makes counts, kept across new heads, shown per intent", async () => {
    const pr = 800;
    const head = gh.commit(sha(9001), "work", [gh.main.head], false);
    const id = await intent({ stage: "build", created: at("17:00"), specified_at: at("17:05"), approved_at: at("17:10"), pull_request: pr });
    gh.pulls.set(pr, { number: pr, state: "open", merged: false, merge_commit_sha: null, mergeable: true, draft: true, base: { ref: "main" }, head: { sha: head, ref: "intent/x" }, html_url: `https://github.test/${REPO}/pull/${pr}`, title: "x" });
    const state = mainMergeState();
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(of(await read(), id).main_merges).toBe(0);
    gh.commit(sha(9002), "main moves", [gh.main.head], true);
    await watchTick(db, gh.gh, Date.now(), null, state);
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(of(await read(), id).main_merges).toBe(1);
    gh.commit(sha(9003), "main moves again", [gh.main.head], true);
    await watchTick(db, gh.gh, Date.now(), null, state);
    await watchTick(db, gh.gh, Date.now(), null, state);
    expect(of(await read(), id).main_merges).toBe(2);
    // carried to a new head (a builder's push), dropped for another pull request
    const was = { pr, head: "a", draft: false, mergeable: true, state: "open", merged: false, base: "main", checks: {}, at: at("17:00"), main_merges: 2 };
    expect(carrySeen(was, { ...was, head: "b", main_merges: undefined }).main_merges).toBe(2);
    expect(carrySeen(was, { ...was, pr: pr + 1, head: "b", main_merges: undefined }).main_merges).toBeUndefined();
  });

  test("read: GET /api/delivery answers an admin, refuses a traveler and no session; the MCP tool delivery is listed and answers the same", async () => {
    // the route reads at the real clock: accepted an hour ago
    const ago = (m: number) => new Date(Date.now() - m * MIN).toISOString();
    const id = await intent({ stage: "accepted", created: ago(120), decided_at: ago(60) });
    const ok = await call("GET", "/api/delivery?days=3");
    expect(ok.status).toBe(200);
    expect(ok.data.days).toBe(3);
    expect(ok.data.intents.map((t: any) => t.id)).toEqual([id]);
    expect((await call("GET", "/api/delivery", undefined, travelerCookie)).status).toBe(403);
    expect((await call("GET", "/api/delivery", undefined, "")).status).toBe(401);
    const tools = (await rpc("tools/list", {})).result.tools as { name: string; description: string }[];
    const t = tools.find((x) => x.name === "delivery")!;
    expect(t.description).toContain("Read-only");
    const j = await rpc("tools/call", { name: "delivery", arguments: { days: 3 } });
    const got = JSON.parse(j.result.content[0].text);
    expect(got.intents.map((x: any) => [x.id, x.lead_ms, x.segments])).toEqual(ok.data.intents.map((x: any) => [x.id, x.lead_ms, x.segments]));
    expect(got.per_day.map((x: any) => x.day)).toEqual(ok.data.per_day.map((x: any) => x.day));
  });
});
