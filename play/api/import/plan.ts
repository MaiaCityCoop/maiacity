// From the feed's recipe rows and their files to play's assets and version chains (play/SPEC.md §4, §6). Pure: no
// network, no database, so the tests can hold it to every rule.
import { hashBytes } from "../src/hash";
import { versionId } from "../src/versions";
import type { BroughtRow, EntryView } from "./feed";
import { assetIdOf } from "../src/uuid";
import { labelOf, parseRef, type Label } from "../src/recipes";

export { labelOf, parseRef, RECIPE_HEAD, type Label } from "../src/recipes";

export type PlannedFile = { hash: string; size: number; bytes: Uint8Array; label: Label };
export type PlannedVersion = {
  id: string;
  number: number;
  parents: string[];
  recipe: string | null;
  defaultVariant: string | null;
  variants: Record<string, { recipe: string; card: unknown }>;
  card: unknown | null;
  engine: number | null;
  note: string;
  edits: string[];
};
export type PlannedAsset = {
  /** its UUID (derived from its avenDB entry) */
  id: string;
  /** its readable name, `<grp>/<slug>`: what legacy's refs named it by, resolved here once and never stored as a reference */
  name: string;
  grp: string;
  slug: string;
  label: string;
  versions: PlannedVersion[];
  imported: { vault: string; entry: string; heads: string[]; authors: string[] };
};

export class PlanError extends Error {}

/** an entry's rows, one for each version and variant; an entry of one version and no variants brings none, and its
 * own row is that version, on its main line */
export const broughtOf = (view: EntryView): BroughtRow[] =>
  view.brought?.length
    ? view.brought
    : [{ line: null, edit: view.heads?.[0] ?? "", at: view.heads ?? [], files: view.files ?? [], record: view.record }];

/**
 * One asset from its entry's full view (`brought`: one row for each version and each variant, each with its own record
 * and its one recipe file). Each file must hash to the recipe its card names and its last line must name the version
 * and variant its card does. Versions follow each other in number order, each the parent of the next. In a kind of
 * variants (actors, machines) the version has no recipe of its own: the variant on the entry's main line is the one a
 * ref without a variant names.
 */
export function planAsset(view: EntryView, files: Map<string, Uint8Array>): { asset: PlannedAsset; files: PlannedFile[] } {
  const top = view.record?.card;
  if (!top?.group || !top?.id) throw new PlanError(`entry ${view.entry}: its record has no card`);
  const grp: string = top.group;
  const slug: string = top.id;
  const name = `${grp}/${slug}`;
  const id = assetIdOf(view.entry);
  const planned: PlannedFile[] = [];
  type Row = { n: number; variant: string | null; main: boolean; hash: string; record: any; edit: string };
  const rows: Row[] = [];
  for (const b of broughtOf(view)) {
    const card = b.record?.card;
    if (!card || card.group !== grp || card.id !== slug) throw new PlanError(`${name}: a row of entry ${view.entry} is not its card`);
    if ((b.files ?? []).length !== 1) throw new PlanError(`${name}@${card.version}: ${b.files?.length ?? 0} files, not one`);
    const f = b.files[0];
    const bytes = files.get(f.root);
    if (!bytes) throw new PlanError(`${name}: file ${f.root} was not read`);
    const hash = hashBytes(bytes);
    if (hash !== card.recipe) throw new PlanError(`${name}@${card.version}: its file hashes to ${hash}, its card names ${card.recipe}`);
    const label = labelOf(new TextDecoder().decode(bytes));
    const variant = card.variant ?? null;
    if (!label || label.id !== slug || label.v !== Number(card.version) || label.variant !== variant)
      throw new PlanError(`${name}@${card.version}${variant ? `:${variant}` : ""}: its file names ${label ? `${label.id}@${label.v}:${label.variant}` : "nothing"}`);
    planned.push({ hash, size: bytes.length, bytes, label });
    rows.push({ n: Number(card.version), variant, main: b.line === null, hash, record: b.record, edit: b.edit });
  }
  if (!rows.length) throw new PlanError(`${name}: its entry brings no version`);
  const numbers = [...new Set(rows.map((r) => r.n))].sort((a, b) => a - b);
  const versions: PlannedVersion[] = [];
  for (const n of numbers) {
    const of = rows.filter((r) => r.n === n);
    const bases = of.filter((r) => r.variant === null);
    if (bases.length > 1) throw new PlanError(`${name}@${n}: ${bases.length} rows without a variant`);
    const variants: PlannedVersion["variants"] = {};
    for (const r of of.filter((r) => r.variant !== null)) {
      if (variants[r.variant!]) throw new PlanError(`${name}@${n}:${r.variant}: two rows`);
      variants[r.variant!] = { recipe: r.hash, card: r.record };
    }
    let defaultVariant: string | null = null;
    let main: Row;
    if (bases[0]) main = bases[0];
    else {
      const firsts = of.filter((r) => r.main);
      if (firsts.length !== 1) throw new PlanError(`${name}@${n}: ${firsts.length} variants on its main line, so none is its first`);
      main = firsts[0];
      defaultVariant = main.variant;
    }
    const content = {
      asset: id,
      parents: versions.length ? [versions[versions.length - 1].id] : [],
      recipe: bases[0]?.hash ?? null,
      defaultVariant,
      variants,
      card: main.record,
      engine: Number(main.record?.engine?.version ?? main.record?.card?.engine) || null,
    };
    versions.push({ ...content, id: versionId(content), number: n, note: `${main.record?.note ?? main.record?.card?.note ?? ""}`, edits: of.map((r) => r.edit) });
  }
  const newest = Number(top.version);
  if (versions.at(-1)!.number !== newest) throw new PlanError(`${name}: its newest version is ${newest}, its rows go to ${versions.at(-1)!.number}`);
  return {
    asset: {
      id,
      name,
      grp,
      slug,
      label: `${top.label ?? view.record?.title ?? slug}`,
      versions,
      imported: { vault: view.vault, entry: view.entry, heads: view.heads ?? [], authors: (view.authors ?? []).map((a) => `${a.kind}:${a.name}`) },
    },
    files: planned,
  };
}

export type PlannedPin = { slot: string; asset: string; number: number; variant: string | null; params: Record<string, unknown> | null };

/**
 * Legacy Sandbox 4's pins as play's Sandbox 1's: the village's assets config ({slot: {entry, at}}), translated through
 * the repo's table of avenDB pins to refs (play/api/import/legacy/pins.fixture.json), and the garden's plants ({id, v,
 * pin}), each a plants/<id>@<v> whose pin must name that plant's avenDB entry.
 */
export function planPins(
  assets: Record<string, { entry: string; at: string[] }>,
  garden: unknown,
  fixture: Record<string, string>,
  entryOf: Map<string, string>, // asset id -> its avenDB entry
): PlannedPin[] {
  const pins: PlannedPin[] = [];
  for (const [slot, p] of Object.entries(assets)) {
    const ref = fixture[`${p.entry}@${[...p.at].sort().join(",")}`];
    if (!ref) throw new PlanError(`pin ${slot}: the repo's table doesn't name ${p.entry}`);
    const r = parseRef(ref);
    if (entryOf.get(r.asset) !== p.entry) throw new PlanError(`pin ${slot}: ${r.asset} is not entry ${p.entry}`);
    pins.push({ slot, asset: r.asset, number: r.number, variant: r.variant, params: r.params });
  }
  const walk = (o: unknown, path: string[]) => {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, [...path, `${(x as any)?.id ?? i}`]));
    else if (o && typeof o === "object") {
      const x = o as any;
      if (x.pin) {
        const asset = `plants/${x.id}`;
        if (entryOf.get(asset) !== x.pin.entry) throw new PlanError(`garden ${path.join("/")}: ${asset} is not entry ${x.pin.entry}`);
        pins.push({ slot: `garden/${path.join("/")}`, asset, number: Number(x.v), variant: null, params: null });
        return;
      }
      for (const [k, v] of Object.entries(x)) walk(v, [...path, k]);
    }
  };
  walk(garden, []);
  return pins;
}

/** an asset named by a readable ref, `group/id[@v][:variant][?values]`, as legacy's cards name other assets */
const READABLE = /^((?:plants|things|machines|buildings|actors|biomes)\/[a-z0-9][a-z0-9-]{0,79})(?:@([1-9][0-9]{0,5}))?(?::([a-z0-9][a-z0-9-]{0,79}))?(?:\?(.*))?$/;

/** what a string rewritten to it leaves: nothing, the field or element it was gone */
const DROP = Symbol("drop");

/** every string in a JSON value, rewritten by `f` (a new value; the old one left alone); one rewritten to DROP is left out */
function mapStrings(v: unknown, f: (s: string) => string | typeof DROP): unknown {
  if (typeof v === "string") return f(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f)).filter((x) => x !== DROP);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, f)] as const).filter(([, x]) => x !== DROP));
  return v;
}

/** refs between assets play doesn't keep: the pickup's to the Power Cube it carried (Samuel 2026-11-02: not needed) */
export const DROPPED: Record<string, string[]> = { "machines/pickup": ["machines/powercube"] };

/**
 * Every asset named by hash (play/SPEC.md §4): where a card names another asset by a readable ref (a biome its cover's
 * kinds, `biomes/cover@1:fern?seed=7`; a pickup the Power Cube it carries, `machines/powercube@3`), the ref becomes the
 * build of the recipe it names, `<hash>?values`. A card's own `ref`, its label, names itself and stays. A ref to another
 * asset that names no version, or one not imported, is refused: nothing is left to be resolved by name. The versions'
 * ids are made again over the rewritten cards, each chained to the one before. Returns how many refs were rewritten.
 */
export function hashRefs(assets: PlannedAsset[]): number {
  // (a ref dropped, DROPPED, is no ref rewritten: it is gone)
  const hashOf = new Map<string, string>();
  for (const a of assets)
    for (const v of a.versions) {
      for (const [name, x] of Object.entries(v.variants)) hashOf.set(`${a.name}@${v.number}:${name}`, x.recipe);
      const own = v.recipe ?? (v.defaultVariant ? v.variants[v.defaultVariant]?.recipe : null);
      if (own) hashOf.set(`${a.name}@${v.number}`, own);
    }
  let n = 0;
  for (const a of assets) {
    const rewrite = (s: string) => {
      const m = READABLE.exec(s);
      if (!m || m[1] === a.name) return s;
      if (DROPPED[a.name]?.includes(m[1])) return DROP;
      if (!m[2]) throw new PlanError(`${a.name}: its card names ${s}, with no version`);
      const hash = hashOf.get(`${m[1]}@${m[2]}${m[3] ? `:${m[3]}` : ""}`);
      if (!hash) throw new PlanError(`${a.name}: its card names ${s}, which is not imported`);
      n++;
      return m[4] ? `${hash}?${m[4]}` : hash;
    };
    let parent: string | null = null;
    for (const v of a.versions) {
      v.card = mapStrings(v.card, rewrite);
      for (const x of Object.values(v.variants)) x.card = mapStrings(x.card, rewrite);
      v.parents = parent ? [parent] : [];
      v.id = versionId({ asset: a.id, parents: v.parents, recipe: v.recipe, defaultVariant: v.defaultVariant, variants: v.variants, card: v.card, engine: v.engine });
      parent = v.id;
    }
  }
  return n;
}

/**
 * Each plant version's words — its Latin name, layer, where it comes from, its note and its stages, read out of
 * legacy's plant library (./plants.json, made by ./plants-text.ts) — written into its record as `plant`, so play keeps
 * them in its database, beside the version they describe. Before the versions' ids are made. Returns how many.
 */
export function plantWords(assets: PlannedAsset[], words: Record<string, unknown>): number {
  let n = 0;
  for (const a of assets.filter((x) => x.grp === "plants"))
    for (const v of a.versions) {
      const w = words[`${a.slug}@${v.number}`];
      if (!w || !v.card || typeof v.card !== "object") continue;
      v.card = { ...(v.card as object), plant: w };
      n++;
    }
  return n;
}

/** whether a JSON value names another asset than `self` by a readable ref (what a proposal may not bring) */
export function readableRefs(v: unknown, self: string): string[] {
  const found: string[] = [];
  mapStrings(v, (s) => {
    const m = READABLE.exec(s);
    if (m && m[1] !== self) found.push(s);
    return s;
  });
  return found;
}

/** a garden config with each planting's avenDB pin replaced by the slot of the sandbox's pins it is (`garden/<path>`,
 * the same path `planPins` names it by) */
export function gardenWithSlots(garden: unknown): unknown {
  const walk = (o: unknown, path: string[]): unknown => {
    if (Array.isArray(o)) return o.map((x, i) => walk(x, [...path, `${(x as any)?.id ?? i}`]));
    if (o && typeof o === "object") {
      const x = o as any;
      if (x.pin) {
        const { pin: _, ...rest } = x;
        return { ...rest, slot: `garden/${path.join("/")}` };
      }
      return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v, [...path, k])]));
    }
    return o;
  };
  return walk(garden, []);
}

/**
 * Sandbox 3's pins: every asset legacy MaiaCity V2's world draws (maia/content/maiacity-v2/things.js THINGS, its people's
 * stand-in, the elder woman of seat C), by the slot play's clone names it by. `null`: the asset's newest version.
 */
export const SANDBOX_3: Record<string, string> = {
  water: "things/water-canister@1",
  busStop: "buildings/bus-stop@1",
  gasStation: "buildings/gas-station@1",
  shed: "buildings/old-shed@1",
  solar: "things/solar-panel@1",
  ramp: "things/loading-ramp@1",
  battery: "machines/batterycube@10",
  cube: "machines/electrocube@2",
  pickup: "things/pickup@3",
  tent: "things/bell-tent@1",
  fire: "things/fire-place@1",
  bag: "things/bell-tent-bag@1",
  pack: "things/backpack@2",
  stake: "things/plant-stake@2",
  earth: "things/dug-earth@1",
  van: "things/travel-van@1",
  "stand-in": "actors/stand-in@11",
  "elder-woman": "actors/elder-woman",
};
