import { describe, expect, test } from "bun:test";
import { canonical } from "../src/hash";
import { versionId } from "../src/versions";
import { RECIPE_HEAD, labelOf, parseRef, readableRefs } from "../import/plan";

const tail = (id: string, v: number, variant: string | null) =>
  `\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant)});\n});\n`;
const recipe = (lib: string, id: string, v: number, variant: string | null = null) => RECIPE_HEAD + lib + tail(id, v, variant);

describe("recipe labels", () => {
  test("a recipe file names its asset, version and variant", () => {
    expect(labelOf(recipe("x", "goat", 2, "goat-pied"))).toEqual({ id: "goat", v: 2, variant: "goat-pied" });
    expect(labelOf(recipe("x", "apple", 1))).toEqual({ id: "apple", v: 1, variant: null });
  });
  test("anything else is not one", () => {
    expect(labelOf("console.log(1)")).toBeNull();
    expect(labelOf(recipe("x", "apple", 1).replace("\n});\n", ""))).toBeNull();
  });
});

describe("version ids", () => {
  test("canonical JSON ignores key order", () => {
    expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(canonical({ a: { c: 3, d: 2 }, b: 1 }));
  });
  test("parents are a set", () => {
    const base = { asset: "plants/apple", recipe: "r", defaultVariant: null, variants: {}, card: null, engine: 5 };
    expect(versionId({ ...base, parents: ["a", "b"] })).toBe(versionId({ ...base, parents: ["b", "a"] }));
  });
});

describe("pins", () => {
  test("refs parse", () => {
    expect(parseRef("actors/goat@2:goat-pied?detail=1")).toEqual({ asset: "actors/goat", number: 2, variant: "goat-pied", params: { detail: "1" } });
    expect(() => parseRef("goat")).toThrow(/not an asset ref/);
  });
});

describe("every asset by hash", () => {
  test("a readable ref to another asset is found, its own ref is not", () => {
    const card = { card: { ref: "biomes/meadow@1", cover: [{ kind: "fern", ref: "biomes/cover@1:fern?seed=7" }, { ref: "ab".repeat(32) }] } };
    expect(readableRefs(card, "biomes/meadow")).toEqual(["biomes/cover@1:fern?seed=7"]);
    expect(readableRefs({ card: { ref: "biomes/meadow@1" } }, "biomes/meadow")).toEqual([]);
    // its own names, several: the group it is in and the one it moves to (intent dc3c0b3e)
    expect(readableRefs({ card: { preset: "actors/stand-in@11:stand-in?belt=1" } }, ["actors/stand-in", "characters/stand-in"])).toEqual([]);
    expect(readableRefs({ card: { with: "actors/elder-woman@2" } }, ["actors/stand-in", "characters/stand-in"])).toEqual(["actors/elder-woman@2"]);
  });
});
