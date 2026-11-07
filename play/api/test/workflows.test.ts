// The way to production (play/SPEC.md §4.12, "Accept ships it"), as the workflows say it: release.yml moves production
// to a commit of main once main.yml is green for a push (or by hand, or play's Accept again, with a sha), fast-forward
// only, with GITHUB_TOKEN, and starts production.yml on it; production.yml writes SHIP_TOKEN into play's environment on
// the server; the compose file hands it to play-api. Read as YAML, so a change that breaks the way is seen here.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const text = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const yaml = (path: string) => Bun.YAML.parse(text(path)) as any;

describe("the way to production", () => {
  test("release.yml: after main.yml is green for a push to main, or by hand with a sha; one at a time", () => {
    const r = yaml(".github/workflows/release.yml");
    expect(r.name).toBe("release");
    // play's ship watcher finds the run by its name
    expect(r["run-name"]).toBe("release ${{ github.event.workflow_run.head_sha || inputs.sha }}");
    expect(r.on.workflow_run).toEqual({ workflows: ["main"], types: ["completed"], branches: ["main"] });
    expect(yaml(".github/workflows/main.yml").name).toBe("main");
    expect(r.on.workflow_dispatch.inputs.sha.required).toBe(true);
    expect(Object.keys(r.on).sort()).toEqual(["workflow_dispatch", "workflow_run"]);
    expect(r.concurrency).toEqual({ group: "release", "cancel-in-progress": false });
    expect(r.permissions).toEqual({ contents: "write", actions: "write" });
    const job = r.jobs.release;
    expect(job.if).toBe("github.event_name == 'workflow_dispatch' || (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push')");
  });

  test("release.yml: production moves fast-forward to the commit with GITHUB_TOKEN, and production.yml is started on it", () => {
    const steps = yaml(".github/workflows/release.yml").jobs.release.steps as any[];
    // blobless: the commits and trees the ancestry checks read, no file's contents
    expect(steps[0]).toEqual({ uses: "actions/checkout@v4", with: { "fetch-depth": 0, filter: "blob:none", "sparse-checkout": ".github/workflows/release.yml", "sparse-checkout-cone-mode": false } });
    const move = steps.find((s) => s.name?.startsWith("production moves"));
    expect(move.env.SHA).toBe("${{ github.event.workflow_run.head_sha || inputs.sha }}");
    expect(move.run).toContain(`git merge-base --is-ancestor "$SHA" origin/main`);
    expect(move.run).toContain(`git merge-base --is-ancestor "$PROD" "$SHA"`);
    expect(move.run).toContain(`git push origin "$SHA:refs/heads/production"`);
    expect(move.run).not.toContain("--force");
    expect(move.run).not.toMatch(/\bpush\b[^\n]*\s-f\b/);
    // only GITHUB_TOKEN: no secret is read here
    expect(text(".github/workflows/release.yml")).not.toContain("secrets.");
    const deploy = steps.find((s) => s.name === "production.yml deploys it");
    expect(deploy.env.GH_TOKEN).toBe("${{ github.token }}");
    expect(deploy.run).toBe(`gh workflow run production.yml --ref production --repo "$GITHUB_REPOSITORY"`);
  });

  test("production.yml: started by workflow_dispatch, every job reads main's checks on its own commit, and it writes SHIP_TOKEN into play.env", () => {
    const p = yaml(".github/workflows/production.yml");
    expect(Object.keys(p.on)).toContain("workflow_dispatch");
    // the jobs play's ship watcher follows, by their names
    const names = Object.values(p.jobs).map((j: any) => j.name);
    for (const n of ["The image", "The backup", "The server", "The website"]) expect(names).toContain(n);
    expect(p.jobs.backup.steps.map((s: any) => s.name)).toContain("Back up play");
    for (const job of Object.values(p.jobs) as any[]) {
      const gate = job.steps.find((s: any) => s.uses === "./.github/actions/main-green");
      expect(gate.with).toEqual({ token: "${{ github.token }}", sha: "${{ github.sha }}" });
      expect(job.permissions.checks).toBe("read");
    }
    const green = yaml(".github/actions/main-green/action.yml");
    expect(green.inputs.checks.default).toBe("play / API and site|website / build");
    expect(green.runs.steps[0].run).toContain("passed()");
    const start = p.jobs.server.steps.find((s: any) => s.name === "Start play-api, import, and answer play.maia.city");
    expect(start.env.SHIP_TOKEN).toBe("${{ secrets.SHIP_TOKEN }}");
    expect(start.env.SHIP_REPO).toBe("${{ github.repository }}");
    const env = start.run.slice(start.run.indexOf("cat > play.env <<EOF2"), start.run.indexOf("\nEOF2", start.run.indexOf("cat > play.env")));
    expect(env).toContain("\nSHIP_TOKEN=$SHIP_TOKEN");
    expect(env).toContain("\nSHIP_REPO=$SHIP_REPO");
    // the token is never echoed
    expect(start.run).not.toMatch(/echo[^\n]*\$SHIP_TOKEN/);
  });

  test("play-api gets SHIP_TOKEN and SHIP_REPO from play.env", () => {
    const c = yaml("play/docker-compose.play.yml");
    expect(c.services["play-api"].environment).toMatchObject({ SHIP_TOKEN: "${SHIP_TOKEN:-}", SHIP_REPO: "${SHIP_REPO:-}" });
  });
});
