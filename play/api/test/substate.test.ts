// Sub-states (src/substate.ts, play/SPEC.md §4.12; intent 2bf8af96-5708-42d2-8556-da35f3f805ba) against a real Postgres
// and a fake GitHub (./fixtures/github.ts).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { BlobStore } from "../src/blobs";
import { seedSkills } from "../import/skills";
import { type Db } from "../src/kit/pg";
import { watchTick } from "../src/watcher";
import { INTENT_CONTEXT, type Pull } from "../src/github";
import { checksSeen, sub, subStateOf, type PrSeen } from "../src/substate";
import { fakeGitHub, green, REPO, sha } from "./fixtures/github";
import { type Api, appOn, type Fresh, freshDb, human, request, suite, tempStore, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const SOURCE = "module.exports.recipe = function (id, v) {\n  return { meta: { id, v } };\n};\n";
const SPEC = {
  goal: "Something of play's is made.",
  nothing_to_reduce: "A test fixture: nothing to reduce.",
  scope: "play/api/src: something small.",
  checks: [
    { check: "Its tests pass", how: "test", by: "bun test", run: "cd play/api && bun test" },
    { check: "It looks right", how: "look", by: "the board", must: false },
  ],
};
const CHECKS = SPEC.checks.map((c, i) => ({ id: `c${i + 1}`, must: c.must !== false, ...c }));

describe("subStateOf", () => {
  const HEAD = sha(1);
  const now = Date.parse("2026-11-07T12:00:00Z");
  const seen = (more: Partial<PrSeen> = {}): PrSeen => ({
    pr: 7, head: HEAD, draft: false, mergeable: true, state: "open", merged: false, base: "main",
    checks: { "play / API and site": "success", "website / build": "success" }, at: new Date(now - 5_000).toISOString(), ...more,
  });
  const passed = { c1: { pass: true, at: "2026-11-07T11:00:00Z", commit: HEAD } };
  const row = (more: Record<string, unknown> = {}) => ({ stage: "proposal", spec: { checks: CHECKS, nothing_to_reduce: "x" }, results: passed, work: null, pull_request: 7, ship: null, held_by: [], pr_seen: seen(), ...more }) as any;
  const of = (r: any) => subStateOf(r, r.pr_seen, now);

  test("a skipped check reads as skipped", () => {
    const run = (name: string, conclusion: string | null, status = "completed", started_at = "2026-11-07T10:00:00Z", id = 1) => ({ name, status, conclusion, started_at, id });
    expect(checksSeen([
      run("play", "skipped"), run("website", "skipped"), run("lint", "neutral"), run("old", "cancelled"),
      run("tests", "failure"), run("timed", "timed_out"), run("ok", "success"), run("busy", null, "in_progress"), run("next", null, "queued"),
    ])).toEqual({ play: "skipped", website: "skipped", lint: "success", old: "cancelled", tests: "failure", timed: "failure", ok: "success", busy: "running", next: "queued" });
    // the newest of a name decides: a ready run's success after a draft's skip, and the other way round
    expect(checksSeen([run("play", "skipped", "completed", "2026-11-07T10:00:00Z"), run("play", "success", "completed", "2026-11-07T10:00:02Z")])).toEqual({ play: "success" });
    expect(checksSeen([run("play", "success", "completed", "2026-11-07T10:00:00Z"), run("play", "skipped", "completed", "2026-11-07T10:00:02Z")])).toEqual({ play: "skipped" });
    // the required checks still decide Ship's gate: a skipped one waits, a cancelled one is red, others' states decide nothing
    const gate = (checks: PrSeen["checks"]) => of(row({ pr_seen: seen({ checks }) }));
    const green = { "play / API and site": "success", "website / build": "success" } as const;
    expect(gate({ ...green, play: "skipped", website: "skipped" })).toMatchObject({ state: "waiting", tag: "Accept and ship" });
    expect(gate({ ...green, "play / API and site": "skipped" })).toMatchObject({ state: "working", tag: "checks running" });
    expect(gate({ ...green, "website / build": "cancelled" })).toMatchObject({ state: "failed", tag: "check red", why: expect.stringContaining("'website / build' is cancelled") });
  });

  test("the newest run of main.yml decides: a check from an older run that the newest has not made reads as that run does (running, queued, skipped), never as the older green", () => {
    const at = (min: number) => `2026-11-10T19:${min}:00Z`;
    const check = (name: string, suite: number, conclusion: string | null, started_at: string, id = 1) => ({ name, status: conclusion ? "completed" : "in_progress", conclusion, started_at, id, check_suite: { id: suite } });
    const mainRun = (id: number, suite: number, started: string, status: string, conclusion: string | null = null) => ({ id, check_suite_id: suite, created_at: started, run_started_at: started, status, conclusion });
    const first = [check("play / API", 1, "success", at(20)), check("play / API and site", 1, "success", at(28)), check("website / build", 1, "success", at(22)), check("Intent named", 7, "success", at(20))];
    const green = { "play / API": "success", "play / API and site": "success", "website / build": "success", "Intent named": "success" } as const;
    const one = mainRun(1, 1, at(20), "completed", "success");
    // one run, or none listed: the check runs as they are
    expect(checksSeen(first)).toEqual(green);
    expect(checksSeen(first, [one])).toEqual(green);
    // #2250: a second run in progress, its required job not made yet; another workflow's check stays as it is
    const second = [...first, check("play / API", 2, null, at(37))];
    expect(checksSeen(second, [one, mainRun(2, 2, at(37), "in_progress")])).toEqual({ ...green, "play / API": "running", "play / API and site": "running", "website / build": "running" });
    expect(checksSeen(first, [mainRun(2, 2, at(37), "queued"), one])).toEqual({ ...green, "play / API": "queued", "play / API and site": "queued", "website / build": "queued" });
    // #2243: a later run whose jobs were skipped; one cancelled before it made them
    const skipped = [...first, check("play", 2, "skipped", at(30)), check("website", 2, "skipped", at(30))];
    expect(checksSeen(skipped, [one, mainRun(2, 2, at(30), "completed", "skipped")])).toEqual({ ...green, "play / API": "skipped", "play / API and site": "skipped", "website / build": "skipped", play: "skipped", website: "skipped" });
    expect(checksSeen(first, [one, mainRun(2, 2, at(30), "completed", "cancelled")])).toMatchObject({ "play / API and site": "cancelled", "Intent named": "success" });
    // the newest run's own checks decide once it made them, whatever an older run said; a re-run starts its run again
    expect(checksSeen([...skipped, check("play / API and site", 3, "success", at(45)), check("website / build", 3, "success", at(41))], [one, mainRun(2, 2, at(30), "completed", "skipped"), mainRun(3, 3, at(40), "completed", "success")]))
      .toMatchObject({ "play / API and site": "success", "website / build": "success", "play / API": "skipped" });
    expect(checksSeen(second, [{ ...one, run_started_at: at(50) }, mainRun(2, 2, at(37), "completed", "success")])).toMatchObject({ "play / API and site": "success", "play / API": "skipped" });
    const row_ = (checks: PrSeen["checks"]) => of(row({ pr_seen: seen({ checks }) }));
    expect(row_(checksSeen(second, [one, mainRun(2, 2, at(37), "in_progress")]))).toEqual({ state: "working", tag: "checks running", why: "Waiting for #7's checks (play / API and site, website / build)" });
  });

  test("four sub-states: each stage, held or not, a failed must, a red ship, and code whose head moved, whose checks run, whose mergeable is null, false or true, or whose pr_seen is stale", () => {
    const dep = [{ id: "d", title: "The engine", stage: "build" }];
    const table: [string, any, string, string][] = [
      ["an idea", row({ stage: "idea", spec: null, results: null, pull_request: null, pr_seen: null }), "idle", "no agent"],
      ["specified", row({ stage: "specify", results: null, pull_request: null }), "waiting", "Approve spec"],
      ["specified, held", row({ stage: "specify", results: null, pull_request: null, held_by: dep }), "waiting", "Approve spec"],
      ["specified without its reduce step", row({ stage: "specify", spec: { checks: CHECKS }, results: null, pull_request: null }), "working", "reduce step"],
      ["in Build", row({ stage: "build", results: null, pull_request: null }), "working", "being built"],
      ["in Build, held", row({ stage: "build", results: null, pull_request: null, held_by: dep }), "idle", "held: waits for The engine"],
      ["in Build, a must failed", row({ stage: "build", results: { c1: { pass: false } } }), "failed", "c1 failed"],
      ["Ship red", row({ ship: { pr: 7, outcome: "red", report: { step: "main's checks", why: "main's checks are failure", at: "2026-11-07T11:30:00Z" } } }), "failed", "Ship red at main's checks"],
      ["work waiting", row({ work: { kind: "asset" }, pull_request: null, pr_seen: null }), "waiting", "Accept"],
      ["work, held", row({ work: { kind: "asset" }, pull_request: null, pr_seen: null, held_by: dep }), "idle", "held: waits for The engine"],
      ["code ready", row(), "waiting", "Accept and ship"],
      ["code, held", row({ held_by: dep }), "idle", "held: waits for The engine"],
      ["code, its head moved", row({ pr_seen: seen({ head: sha(2) }) }), "working", "moved past the checked commit"],
      ["code, its checks running", row({ pr_seen: seen({ checks: { "play / API and site": "running", "website / build": "success" } }) }), "working", "Waiting for #7's checks (play / API and site)"],
      ["code, mergeable null", row({ pr_seen: seen({ mergeable: null }) }), "working", "Waiting for GitHub to work out whether #7 merges"],
      ["code, mergeable false", row({ pr_seen: seen({ mergeable: false }) }), "failed", "conflicts with main"],
      ["code, a required check red", row({ pr_seen: seen({ checks: { "play / API and site": "failure", "website / build": "success" } }) }), "failed", "'play / API and site' is failure"],
      ["code, a draft", row({ pr_seen: seen({ draft: true }) }), "failed", "is a draft"],
      ["code, pr_seen stale", row({ pr_seen: seen({ at: new Date(now - 61_000).toISOString() }) }), "working", "reading #7 on GitHub"],
      ["code, not read yet", row({ pr_seen: null }), "working", "reading #7 on GitHub"],
      ["in Ship, in the merge queue", row({ stage: "ship", ship: { steps: [{ key: "queued", state: "running", note: "2nd in the merge queue · its group 1234567: 1 of 2 checks done" }] } }), "working", "2nd in the merge queue"],
      ["in Ship, on its way", row({ stage: "ship", ship: { steps: [{ key: "queued", state: "green" }, { key: "merged", state: "green" }, { key: "main", name: "main's checks", state: "running" }] } }), "working", "main's checks"],
    ];
    for (const [what, r, state, why] of table) {
      const s = of(r);
      expect({ what, state: s?.state }).toEqual({ what, state: state as any });
      expect({ what, why: s?.why.includes(why) }).toEqual({ what, why: true });
    }
    expect(of(row({ stage: "accepted" }))).toBeNull();
    expect(of(row({ stage: "archived" }))).toBeNull();
    // a red ship before its merge stands until the checks are recorded again; one after its merge is shipped again
    const red = { pr: 7, outcome: "red", report: { step: "Ready to merge", why: "x", at: "2026-11-07T11:30:00Z" } };
    expect(of(row({ ship: red, results: { c1: { pass: true, at: "2026-11-07T11:45:00Z", commit: HEAD } } }))?.state).toBe("waiting");
    expect(of(row({ ship: { ...red, merge: sha(3) }, results: { c1: { pass: true, at: "2026-11-07T11:45:00Z", commit: HEAD } } }))?.why).toContain("Accept ships it again");
    // every sub-state has a short tag, the dialog's chip
    for (const [what, r] of table) {
      const t = of(r)!.tag;
      expect({ what, short: t.length > 0 && t.length <= 32 }).toEqual({ what, short: true });
    }
  });

  // intent 2052a88c-0b9d-4bcd-bd4a-12a2ab609994: the reason names checks by id, grouped by what they lack, never a statement
  test("reasons name checks by id", () => {
    const OLD = sha(9), NEW = sha(2);
    const checks = ["c1", "c2", "c3", "c4", "c5"].map((id) => ({ id, check: `The statement of ${id}, long and whole`, must: true, run: "true" }));
    const results = { c1: { pass: true, commit: OLD }, c2: { pass: true, commit: OLD }, c3: { pass: true, commit: OLD }, c5: { pass: true, commit: NEW } };
    const moved = of(row({ spec: { checks, nothing_to_reduce: "x" }, results, pr_seen: seen({ head: NEW }) }))!;
    expect(moved).toMatchObject({ state: "working", tag: "head moved" });
    expect(moved.why).toContain(`c1, c2, c3 passed on ${OLD.slice(0, 7)}, not yet on the head ${NEW.slice(0, 7)}; c4 no result yet`);
    expect(moved.why).not.toContain("statement");
    const failed = of(row({ stage: "build", spec: { checks, nothing_to_reduce: "x" }, results: { c2: { pass: false } } }))!;
    expect(failed).toEqual({ state: "failed", tag: "c2 failed", why: "c2 failed" });
    const conflict = of(row({ stage: "build", pr_seen: seen({ mergeable: false, conflicts: { head: HEAD, main: sha(5), files: ["a.ts"] } }) }))!;
    expect(conflict).toEqual({ state: "failed", tag: "conflicts with main", why: "conflicts with main: a.ts" });
  });
});

// intent f7721142-936b-4c1c-8be8-23e8cff21f89: a pass counts on its own commit only; a pull request behind main is fine,
// the merge queue tests it with main, so main moving changes nothing of its sub-state
describe("results on the head, main moving resets nothing", () => {
  const now = Date.parse("2026-11-09T16:00:00Z");
  const A = sha(21), B = sha(22);
  const GREEN = { "play / API and site": "success", "website / build": "success" } as const;
  const checks = ["c1", "c2", "c3"].map((id) => ({ id, check: `statement ${id}`, must: true, run: "true" }));
  const on = (commit: string) => Object.fromEntries(checks.map((c) => [c.id, { pass: true, at: "2026-11-09T15:00:00Z", commit }]));
  const seen = (more: Partial<PrSeen> = {}): PrSeen => ({
    pr: 9, head: A, draft: false, mergeable: true, state: "open", merged: false, base: "main", checks: { ...GREEN }, at: new Date(now - 5_000).toISOString(), ...more,
  });
  const row = (pr_seen: PrSeen, results: Record<string, unknown> = on(A)) => ({ stage: "proposal", spec: { checks, nothing_to_reduce: "x" }, results, work: null, pull_request: 9, ship: null, held_by: [], pr_seen }) as any;
  const of = (r: any) => subStateOf(r, r.pr_seen, now);

  test("waiting on its head, behind main or not; a new head is working until recorded there; a conflict failed", () => {
    expect(of(row(seen()))).toEqual({ state: "waiting", tag: "Accept and ship", why: "Accept and ship" });
    expect(of(row(seen({ head: B })))).toMatchObject({ state: "working", tag: "head moved" });
    expect(of(row(seen({ head: B }), on(B)))).toEqual({ state: "waiting", tag: "Accept and ship", why: "Accept and ship" });
    expect(of(row(seen({ mergeable: false })))).toMatchObject({ state: "failed", tag: "conflicts with main" });
    expect(of(row(seen({ checks: { ...GREEN, "play / API and site": "failure" } })))).toMatchObject({ state: "failed", tag: "check red" });
  });
});
