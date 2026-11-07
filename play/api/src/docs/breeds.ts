// Breeds (play/SPEC.md "Breeds", Samuel 2026-11-06: "breeds are like variants under the hood but keep tracking their
// main so they live alongside main"): a breed is a variant of a document beside Main, named, holding only what it
// overrides. What it overrides is a set of fields (paths into the document's JSON), and only an asset's `source` and
// `card` may be overridden. When an edit is accepted on Main it is merged into every breed, and on every field the
// breed overrides the breed keeps its own value; a field both changed keeps the breed's.

/** a path into a document's JSON: its field names, from the root */
export type Path = string[];

/** the fields a breed may override */
export const BREED_FIELDS = ["source", "card"];

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const key = (p: Path) => JSON.stringify(p);

/**
 * The fields `b` changes from `a`, under the fields a breed may override: down into objects, field by field; a text, a
 * number or a list changed whole is one field.
 */
export function changedFields(a: any, b: any, roots: string[] = BREED_FIELDS): Path[] {
  const out: Path[] = [];
  const walk = (x: unknown, y: unknown, path: Path) => {
    if (same(x, y)) return;
    if (isObj(x) && isObj(y)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], [...path, k]);
      return;
    }
    out.push(path);
  };
  for (const r of roots) walk(a?.[r], b?.[r], [r]);
  return out;
}

/** the fields `b` changes from `a` outside the fields a breed may override */
export const outsideBreed = (a: any, b: any): Path[] => changedFields(a, b, Object.keys({ ...(a ?? {}), ...(b ?? {}) }).filter((k) => !BREED_FIELDS.includes(k)));

/** two sets of overridden fields as one, a field and the fields inside it kept once (the outer one) */
export function union(a: Path[], b: Path[]): Path[] {
  const all = [...a, ...b].sort((x, y) => x.length - y.length);
  const out: Path[] = [];
  for (const p of all) if (!out.some((q) => q.length <= p.length && q.every((s, i) => s === p[i]))) out.push(p);
  return out.sort((x, y) => (key(x) < key(y) ? -1 : 1));
}

/** `base` with each field of `paths` as `from` has it (left out where `from` has none) */
export function overlay(base: any, from: any, paths: Path[]): any {
  const out = structuredClone(base);
  for (const p of paths) {
    let src: any = from;
    for (const s of p) src = isObj(src) ? src[s] : undefined;
    let at: any = out;
    for (const s of p.slice(0, -1)) {
      if (!isObj(at[s])) {
        if (src === undefined) {
          at = null;
          break;
        }
        at[s] = {};
      }
      at = at[s];
    }
    if (at === null) continue;
    const last = p[p.length - 1];
    if (src === undefined) delete at[last];
    else at[last] = structuredClone(src);
  }
  return out;
}

/** what a breed would be with Main at `main`: Main, and on every field it overrides, the breed's own value */
export const breedOn = (main: any, breed: any, overrides: Path[]) => overlay(main, breed, overrides);
