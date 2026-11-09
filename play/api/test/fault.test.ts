// What an error answers: over HTTP an HttpError's status, else play's fault; to an agent over MCP and to an
// auto-accept rule, GitHub's own refusal too (as before intent 5884ade4's untangle; its round-2 re-audit).
import { describe, expect, test } from "bun:test";
import { answerOf, statusOf } from "../src/fault";
import { GitHubError } from "../src/github";
import { HttpError } from "../src/kit/errors";

describe("what an error answers", () => {
  test("an HttpError answers its status everywhere", () => {
    const e = new HttpError("There is no such intent.", 404);
    expect(statusOf(e)).toBe(404);
    expect(answerOf(e)).toBe(404);
  });
  test("GitHub's refusal answers an agent and a rule, and is play's fault over HTTP", () => {
    const e = new GitHubError("Pull request is not mergeable", 405);
    expect(statusOf(e)).toBeNull();
    expect(answerOf(e)).toBe(405);
  });
  test("anything else is play's fault", () => {
    expect(statusOf(new Error("boom"))).toBeNull();
    expect(answerOf(new Error("boom"))).toBeNull();
  });
});
