import { describe, expect, test } from "bun:test";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { hashBytes, canonical } from "../src/hash";
import { versionId } from "../src/versions";
import { RECIPE_HEAD, labelOf, parseRef, planAsset, planPins, PlanError } from "../import/plan";
import type { EntryView } from "../import/feed";

const tail = (id: string, v: number, variant: string | null) =>
  `\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant)});\n});\n`;
const recipe = (lib: string, id: string, v: number, variant: string | null = null) => RECIPE_HEAD + lib + tail(id, v, variant);

/** a feed entry of `rows` ([version, variant, line, library]) and the files they bring */
function entry(grp: string, id: string, rows: [number, string | null, string | null, string][]) {
  const files = new Map<string, Uint8Array>();
  const brought = rows.map(([v, variant, line, lib], i) => {
    const bytes = utf8ToBytes(recipe(lib, id, v, variant));
    const root = `root${i}`;
    files.set(root, bytes);
    return {
      line,
      edit: `edit${i}`,
      at: [],
      files: [{ root, len: bytes.length, size: bytes.length + 16 }],
      record: { card: { group: grp, id, version: v, variant: variant ?? undefined, recipe: hashBytes(bytes), label: `${id} ${variant ?? ""}` }, engine: { version: 5 } },
    };
  });
  const newest = brought.reduce((a, b) => (b.record.card.version > a.record.card.version ? b : a));
  const view = { vault: "v", entry: "e", type: "recipe", tags: [], heads: ["h"], record: newest.record, brought } as unknown as EntryView;
  return { view, files };
}

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

describe("planning an asset", () => {
  test("versions chain in number order, each the parent of the next", () => {
    const { view, files } = entry("plants", "apple", [[2, null, null, "b"], [1, null, null, "a"]]);
    const { asset } = planAsset(view, files);
    expect(asset.versions.map((v) => v.number)).toEqual([1, 2]);
    expect(asset.versions[0].parents).toEqual([]);
    expect(asset.versions[1].parents).toEqual([asset.versions[0].id]);
    expect(asset.versions[1].recipe).toBe(hashBytes(files.get("root0")!));
  });

  test("a kind of variants: the main line's variant is the default", () => {
    const { view, files } = entry("actors", "goat", [[1, "goat-saanen", null, "a"], [1, "goat-pied", "line1", "a"]]);
    const v = planAsset(view, files).asset.versions[0];
    expect(v.recipe).toBeNull();
    expect(v.defaultVariant).toBe("goat-saanen");
    expect(Object.keys(v.variants).sort()).toEqual(["goat-pied", "goat-saanen"]);
  });

  test("a file that doesn't hash to its card's recipe is refused", () => {
    const { view, files } = entry("plants", "apple", [[1, null, null, "a"]]);
    files.set("root0", utf8ToBytes(recipe("tampered", "apple", 1)));
    expect(() => planAsset(view, files)).toThrow(PlanError);
  });

  test("a file naming another version than its card is refused", () => {
    const { view, files } = entry("plants", "apple", [[1, null, null, "a"]]);
    const bytes = utf8ToBytes(recipe("a", "apple", 3));
    files.set("root0", bytes);
    (view.brought[0].record.card as any).recipe = hashBytes(bytes);
    expect(() => planAsset(view, files)).toThrow(/names apple@3/);
  });

  test("the same content gives the same version id, a changed byte another", () => {
    const a = entry("plants", "apple", [[1, null, null, "a"]]);
    const b = entry("plants", "apple", [[1, null, null, "a"]]);
    const c = entry("plants", "apple", [[1, null, null, "A"]]);
    const id = (x: typeof a) => planAsset(x.view, x.files).asset.versions[0].id;
    expect(id(a)).toBe(id(b));
    expect(id(a)).not.toBe(id(c));
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
  test("the village's and the garden's pins translate, each held to its entry", () => {
    const entryOf = new Map([["things/coop", "E1"], ["plants/apple", "E2"]]);
    const pins = planPins(
      { hens: { entry: "E1", at: ["h1"] } },
      { outside: { trees: [{ id: "apple", v: 2, pin: { entry: "E2", at: ["h2"] } }] } },
      { "E1@h1": "things/coop@2" },
      entryOf,
    );
    expect(pins).toEqual([
      { slot: "hens", asset: "things/coop", number: 2, variant: null, params: null },
      { slot: "garden/outside/trees/apple", asset: "plants/apple", number: 2, variant: null, params: null },
    ]);
    expect(() => planPins({ hens: { entry: "E9", at: ["h1"] } }, {}, { "E9@h1": "things/coop@2" }, entryOf)).toThrow(/is not entry/);
  });
});
