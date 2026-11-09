// A recipe's graphs read at propose time (src/graphs.ts, intent a5faafad): its comments taken out in one pass, however
// they are written, so no source holds the API up; the rest is in assetdocs.test.ts (propose_asset with graphs).
import { describe, expect, test } from "bun:test";
import { heldGraphs, uncommented } from "../src/graphs";

describe("a recipe's graphs at propose time", () => {
  test("comments out in one pass: a shader named only in a comment is none, a URL's // is kept", () => {
    expect(uncommented('a /* x */ b // c\nd "http://x" /* open')).toBe('a  b \nd "http://x" ');
    expect(() => heldGraphs("module.exports.recipe = 1; // onBeforeCompile\n/* ShaderMaterial */")).not.toThrow();
  });
  test("a source of many unclosed comments is read in linear time", () => {
    const big = "module.exports.recipe = function(){};\n" + ("/* ".repeat(30) + "\n").repeat(60_000);
    const t = performance.now();
    heldGraphs(big);
    expect(performance.now() - t).toBeLessThan(1000);
  });
});
