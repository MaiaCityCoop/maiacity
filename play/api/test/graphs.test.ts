// A recipe's graphs read at propose time (src/graphs.ts, intent a5faafad): its comments taken out in one pass, however
// they are written, so no source holds the API up; the rest is in assetdocs.test.ts (propose_asset with graphs).
import { describe, expect, test } from "bun:test";
import { heldGraphs, uncommented } from "../src/graphs";

describe("a recipe's graphs at propose time", () => {
  test("comments out in one pass: a shader named only in a comment is none, a URL's // is kept", () => {
    expect(uncommented('a /* x */ b // c\nd "http://x" /* open')).toBe('a  b \nd "http://x" ');
    expect(() => heldGraphs("module.exports.recipe = 1; // onBeforeCompile\n/* ShaderMaterial */")).not.toThrow();
  });
  for (const [what, line] of [
    ["unclosed block comments", "/* ".repeat(30)],
    ["line comments and no block", "// x"],
    ["closed block comments and no line", "/* a */ x"],
    ["URLs", "a://b a://b a://b"],
  ])
    test(`a source of many ${what} is read in linear time`, () => {
      const big = "module.exports.recipe = function(){};\n" + `${line}\n`.repeat(Math.ceil(2_000_000 / (line.length + 1)));
      const t = performance.now();
      heldGraphs(big);
      expect(performance.now() - t).toBeLessThan(1000);
    });
});
