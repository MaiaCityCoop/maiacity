// From the feed's recipe rows and their files to play's assets and version chains (play/SPEC.md §4, §6). Pure: no
// network, no database, so the tests can hold it to every rule.
import { hashBytes } from "../src/hash";
import { versionId } from "../src/versions";
import type { BroughtRow, EntryView } from "./feed";
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
  id: string;
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
      asset: name,
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
      id: name,
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
 * the repo's table of avenDB pins to refs (maia/content/assets/pins.fixture.json), and the garden's plants ({id, v,
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
