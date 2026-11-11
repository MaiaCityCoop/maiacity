// One load of each world (intent a35ccd33; play/site/scripts/gpu-loads.ts): an intent's real-GPU checks planned as
// loads, one a world and engine, asked the union of what its calls ask, so every check reads its numbers from it.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { callsOf, parseArgs, plan, union, uncovered } from "../../site/scripts/gpu-loads";

const SCRIPT = resolve(import.meta.dir, "../../site/scripts/gpu-loads.ts");
const g = "bun play/site/scripts/gpu.ts";

describe("one load of each world", () => {
  test("92fbecea's spec: Sandbox 1 and 5, each loaded once per engine, asked every view", () => {
    const checks = [
      { run: "cd play/api && bun test" },
      { run: `${g} --world /sandbox-1/ --views near,mid,far` },
      { run: `${g} --world /sandbox-5/ --views near,mid,far` },
      { run: `${g} --world /sandbox-1/ --frame-within 40` },
      {},
    ];
    expect(plan(checks)).toEqual([
      { n: 0, world: "/sandbox-1/", browser: "chromium", args: "--views near,mid,far" },
      { n: 1, world: "/sandbox-1/", browser: "webkit", args: "--views near,mid,far" },
      { n: 2, world: "/sandbox-5/", browser: "chromium", args: "--views near,mid,far" },
      { n: 3, world: "/sandbox-5/", browser: "webkit", args: "--views near,mid,far" },
    ]);
  });

  test("7313fb26's spec, and chained calls: one load a world and engine, bounds left to the reading", () => {
    expect(plan([{ run: `${g} --world /sandbox-1/` }, { run: `${g} --world /sandbox-5/` }, { run: `${g} --world /sandbox-1/ --frame-within 33` }]).map((l) => [l.world, l.browser, l.args])).toEqual([
      ["/sandbox-1/", "chromium", ""], ["/sandbox-1/", "webkit", ""], ["/sandbox-5/", "chromium", ""], ["/sandbox-5/", "webkit", ""],
    ]);
    expect(callsOf(`${g} --world /sandbox-1/ --steps && ${g} --world /sandbox-5/ --browser webkit; echo done`).map((c) => [c.world, c.browsers])).toEqual([["/sandbox-1/", ["chromium", "webkit"]], ["/sandbox-5/", ["webkit"]]]);
    expect(callsOf("cd play/site && bun scripts/gpu.ts --world '/sandbox-3/'")[0].world).toBe("/sandbox-3/");
    expect(callsOf(g)[0]).toEqual({ world: "/sandbox-5/", browsers: ["chromium", "webkit"], args: new Map() });
  });

  test("the union: a flag once asked stays, a number the largest, a list every value; --walk-within asks a walk; another --inputs another load", () => {
    const a = (s: string) => parseArgs(s.split(" "));
    expect([...union([a("--walk-within 40 --timeout 300 --views near"), a("--sky --timeout 900 --settle 30 --views far,near"), a("--steps --frame-within 20 --world-within 400 --out x --browser webkit")])]).toEqual([
      ["--timeout", "900"], ["--views", "near,far"], ["--walk", true], ["--sky", true], ["--settle", "30"],
    ]);
    const loads = plan([{ run: `${g} --world /sandbox-1/ --browser chromium --inputs a` }, { run: `${g} --world /sandbox-1/ --browser chromium --inputs b` }, { run: `${g} --world '/x; rm -rf /'` }]);
    expect(loads.map((l) => l.args)).toEqual(["--inputs a", "--inputs b"]);
  });

  test("a load answers a call only when asked what the call asks", () => {
    const a = (s: string) => parseArgs(s.split(" ").filter(Boolean));
    const load = a("--world /sandbox-1/ --browser chromium --walk --sky --timeout 600 --views near,mid,far");
    expect(uncovered(load, a("--world /sandbox-1/ --walk-within 40 --frame-within 30 --steps --views far --timeout 300"))).toEqual([]);
    expect(uncovered(load, a("--timeout 900 --settle 10 --views near,top --inputs b"))).toEqual(["the load's --timeout is 600, less than 900", "the load was not asked --settle", "the load's --views is near,mid,far, not all of near,top", "the load was not asked --inputs"]);
    expect(uncovered(a(""), a("--walk"))).toEqual(["the load was not asked --walk"]);
  });

  test("its command prints GitHub's matrix from a spec file, needing nothing installed", () => {
    const at = join(mkdtempSync(join(tmpdir(), "gpu-loads-")), "spec.json");
    writeFileSync(at, JSON.stringify({ intent: { id: "x" }, checks: [{ run: `${g} --world /sandbox-1/ --browser webkit --walk` }] }));
    const p = Bun.spawnSync([process.execPath, SCRIPT, at], { cwd: tmpdir(), stdout: "pipe" });
    expect(JSON.parse(`${p.stdout}`)).toEqual({ include: [{ n: 0, world: "/sandbox-1/", browser: "webkit", args: "--walk" }] });
    expect(Bun.file(SCRIPT).size).toBeGreaterThan(0);
  });
});
