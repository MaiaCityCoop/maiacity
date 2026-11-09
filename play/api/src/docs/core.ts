// A document in Loro, without the database (play/SPEC.md §4.4): its JSON written into Loro containers as its type's
// hints say (./validate.ts; its schema a document, ./schemas.ts), edits applied as Loro operations, a whole new state turned into the few operations that
// make it (so a proposal that sends its whole body still lands as small steps), the state read back as plain JSON at
// any point of its history, and two states compared field by field.
import { LoroDoc, LoroList, LoroMap, LoroMovableList, LoroText } from "loro-crdt";
import { canonical, hashText } from "../kit/hash";
import { nodeAt, problemsOf, SchemaError, type DocType, type Node } from "./validate";
import { HttpError } from "../kit/errors";

/** the one root container every document lives under */
export const ROOT = "doc";
export type Frontiers = { peer: `${number}`; counter: number }[];
export type Path = (string | number)[];
type Box = LoroMap | LoroMovableList | LoroList | LoroText;

/** a text this long is diffed by lines, not characters (a character diff of a whole source can take seconds) */
const LONG = 4000;

export function newDoc(): LoroDoc {
  const d = new LoroDoc();
  d.setRecordTimestamp(true);
  // every commit its own change: two commits a second apart stay two steps of the history
  d.setChangeMergeInterval(0);
  return d;
}

export function fromBytes(snapshot: Uint8Array | null, updates: Uint8Array[]): LoroDoc {
  const d = newDoc();
  if (snapshot?.length) d.import(snapshot);
  if (updates.length) d.importBatch(updates);
  return d;
}

/** the document as plain JSON */
export const jsonOf = (d: LoroDoc): any => (d.toJSON() as Record<string, unknown>)[ROOT] ?? null;
/** the BLAKE3 of a state's canonical JSON: what a named version records */
export const contentHash = (json: unknown): string => hashText(canonical(json));
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof LoroMap || v instanceof LoroMovableList || v instanceof LoroList || v instanceof LoroText);

const isText = (n: Node, v: unknown) => n["x-loro"] === "text" && typeof v === "string";

/** writes `v` as its schema says into a new child at `key` of map `m` */
function putInMap(m: LoroMap, key: string, v: unknown, n: Node): void {
  if (isText(n, v)) {
    const t = m.setContainer(key, new LoroText());
    if ((v as string).length) t.insert(0, v as string);
  } else if (Array.isArray(v)) fill(m.setContainer(key, new LoroMovableList()), v, n);
  else if (isObj(v)) fill(m.setContainer(key, new LoroMap()), v, n);
  else m.set(key, v);
}
/** inserts `v` as its schema says at `i` of list `l` */
function putInList(l: LoroMovableList, i: number, v: unknown, n: Node): void {
  if (isText(n, v)) {
    const t = l.insertContainer(i, new LoroText());
    if ((v as string).length) t.insert(0, v as string);
  } else if (Array.isArray(v)) fill(l.insertContainer(i, new LoroMovableList()), v, n);
  else if (isObj(v)) fill(l.insertContainer(i, new LoroMap()), v, n);
  else l.insert(i, v);
}
function fill(c: LoroMap | LoroMovableList, v: unknown, n: Node): void {
  if (c instanceof LoroMap) for (const [k, x] of Object.entries(v as object)) putInMap(c, k, x, nodeAt(n, [k]));
  else (v as unknown[]).forEach((x, i) => putInList(c, i, x, nodeAt(n, [i])));
}

/** sets text `t` to `s` with the few operations that make the one into the other */
function setText(t: LoroText, s: string): void {
  const was = t.toString();
  if (was === s) return;
  if (was.length > LONG || s.length > LONG) t.updateByLine(s, { timeoutMs: 20000 });
  else t.update(s, { timeoutMs: 5000 });
}

/** a whole new document: its first state written in, not yet committed */
export function seed(d: LoroDoc, t: DocType, json: unknown): void {
  const problems = problemsOf(t, json);
  if (problems.length) throw new SchemaError(problems);
  fill(d.getMap(ROOT), json, t.schema);
}

/**
 * Turns the document into `target` with the fewest operations it can: texts by their changed lines or characters,
 * a list of objects that carry an `id` by its items (removed, inserted, moved, each kept item changed in place),
 * maps by their changed keys, anything else set where it differs. Not yet committed.
 */
export function patchTo(d: LoroDoc, t: DocType, target: unknown): void {
  const problems = problemsOf(t, target);
  if (problems.length) throw new SchemaError(problems);
  patchMap(d.getMap(ROOT), target as Record<string, unknown>, t.schema);
}

function patchMap(m: LoroMap, target: Record<string, unknown>, n: Node): void {
  for (const k of m.keys()) if (!(k in target)) m.delete(k);
  for (const [k, v] of Object.entries(target)) patchChild(m, k, m.get(k), v, nodeAt(n, [k]));
}

function patchChild(parent: LoroMap | LoroMovableList, key: string | number, cur: unknown, v: unknown, n: Node): void {
  if (cur instanceof LoroText && isText(n, v)) return setText(cur, v as string);
  if (cur instanceof LoroMap && isObj(v)) return patchMap(cur, v, n);
  if (cur instanceof LoroMovableList && Array.isArray(v)) return patchList(cur, v, n);
  const same = !(cur instanceof LoroMap || cur instanceof LoroMovableList || cur instanceof LoroText || cur instanceof LoroList) && !isObj(v) && !Array.isArray(v) && !isText(n, v) && cur === v;
  if (same) return;
  if (parent instanceof LoroMap) {
    if (!(cur instanceof LoroMap || cur instanceof LoroMovableList || cur instanceof LoroText) && !isObj(v) && !Array.isArray(v) && !isText(n, v)) parent.set(key as string, v);
    else putInMap(parent, key as string, v, n);
  } else {
    const i = key as number;
    parent.delete(i, 1);
    putInList(parent, i, v, n);
  }
}

const idOf = (x: unknown): string | null => (x instanceof LoroMap ? (typeof x.get("id") === "string" ? (x.get("id") as string) : null) : isObj(x) && typeof x.id === "string" ? x.id : null);

function patchList(l: LoroMovableList, target: unknown[], n: Node): void {
  const item = nodeAt(n, [0]);
  const ids = target.map(idOf);
  const curIds = Array.from({ length: l.length }, (_, i) => idOf(l.get(i)));
  const keyed = ids.every((x) => x !== null) && new Set(ids).size === ids.length && curIds.every((x) => x !== null) && new Set(curIds).size === curIds.length;
  if (keyed) {
    const want = new Set(ids as string[]);
    for (let i = l.length - 1; i >= 0; i--) if (!want.has(curIds[i]!)) l.delete(i, 1);
    for (let i = 0; i < target.length; i++) {
      const id = ids[i]!;
      let j = -1;
      for (let k = i; k < l.length; k++) if (idOf(l.get(k)) === id) (j = k), (k = l.length);
      if (j < 0) putInList(l, i, target[i], item);
      else {
        if (j !== i) l.move(j, i);
        patchChild(l, i, l.get(i), target[i], item);
      }
    }
    return;
  }
  // no ids to follow: item by item where they line up, the rest added or taken away at the end
  const common = Math.min(l.length, target.length);
  for (let i = 0; i < common; i++) patchChild(l, i, l.get(i), target[i], item);
  if (l.length > target.length) l.delete(target.length, l.length - target.length);
  for (let i = common; i < target.length; i++) putInList(l, i, target[i], item);
}

// ---- edits: the small steps an agent sends (MCP), one or more per commit

export type Edit =
  | { op: "set"; path: Path; value: unknown } // a map's key or a list's item, replaced (a text: changed to the value)
  | { op: "insert"; path: Path; value: unknown } // into a list, before the index the path ends with
  | { op: "delete"; path: Path } // a map's key or a list's item
  | { op: "move"; path: Path; to: number } // a list's item, the path ending with its index, to index `to`
  | { op: "text"; path: Path; index: number; delete?: number; insert?: string }; // a range of a text

export class EditError extends HttpError {}

export class DocError extends HttpError {
  constructor(message: string, status = 400, public extra: Record<string, unknown> = {}) {
    super(message, status);
  }
}

/** the container the path leads into (all but its last step), and that last step */
function parentOf(d: LoroDoc, path: Path): [LoroMap | LoroMovableList, string | number] {
  if (!path.length) throw new EditError("an edit names a field: its path is empty");
  let at: unknown = d.getMap(ROOT);
  for (const [i, p] of path.slice(0, -1).entries()) {
    const next = at instanceof LoroMap && typeof p === "string" ? at.get(p) : at instanceof LoroMovableList && typeof p === "number" ? at.get(p) : undefined;
    if (!(next instanceof LoroMap || next instanceof LoroMovableList || next instanceof LoroText)) throw new EditError(`${fmt(path.slice(0, i + 1))}: there is no map or list there`);
    at = next;
  }
  if (!(at instanceof LoroMap || at instanceof LoroMovableList)) throw new EditError(`${fmt(path.slice(0, -1))}: not a map or a list`);
  const last = path[path.length - 1];
  if (at instanceof LoroMap && typeof last !== "string") throw new EditError(`${fmt(path)}: a map's field is named by a string`);
  if (at instanceof LoroMovableList && (typeof last !== "number" || !Number.isInteger(last) || last < 0)) throw new EditError(`${fmt(path)}: a list's item is named by its index`);
  return [at, last];
}
export const fmt = (p: Path) => "$" + p.map((x) => (typeof x === "number" ? `[${x}]` : `.${x}`)).join("");

/** applies `edits` (not yet committed); the caller checks the whole result against its type */
export function applyEdits(d: LoroDoc, t: DocType, edits: Edit[]): void {
  for (const e of edits) {
    const [parent, key] = parentOf(d, e.path);
    const n = nodeAt(t.schema, e.path);
    const cur = parent instanceof LoroMap ? parent.get(key as string) : (key as number) < parent.length ? parent.get(key as number) : undefined;
    if (e.op === "set") {
      if (parent instanceof LoroMovableList && (key as number) >= parent.length) throw new EditError(`${fmt(e.path)}: no item there to set`);
      patchChild(parent, key, cur, e.value, n);
    } else if (e.op === "insert") {
      if (!(parent instanceof LoroMovableList)) throw new EditError(`${fmt(e.path)}: insert is into a list`);
      if ((key as number) > parent.length) throw new EditError(`${fmt(e.path)}: the list has only ${parent.length} items`);
      putInList(parent, key as number, e.value, n);
    } else if (e.op === "delete") {
      if (parent instanceof LoroMap) {
        if (cur === undefined) throw new EditError(`${fmt(e.path)}: nothing there to delete`);
        parent.delete(key as string);
      } else {
        if ((key as number) >= parent.length) throw new EditError(`${fmt(e.path)}: no item there to delete`);
        parent.delete(key as number, 1);
      }
    } else if (e.op === "move") {
      if (!(parent instanceof LoroMovableList)) throw new EditError(`${fmt(e.path)}: move is within a list`);
      const from = key as number;
      if (from >= parent.length || !Number.isInteger(e.to) || e.to < 0 || e.to >= parent.length) throw new EditError(`${fmt(e.path)}: move from ${from} to ${e.to} is outside the list of ${parent.length}`);
      if (from !== e.to) parent.move(from, e.to);
    } else if (e.op === "text") {
      if (!(cur instanceof LoroText)) throw new EditError(`${fmt(e.path)}: not a text`);
      const len = cur.length, del = e.delete ?? 0;
      if (!Number.isInteger(e.index) || e.index < 0 || e.index > len || del < 0 || e.index + del > len) throw new EditError(`${fmt(e.path)}: the range ${e.index}+${del} is outside the text of ${len}`);
      cur.splice(e.index, del, e.insert ?? "");
    } else throw new EditError(`an edit is one of set, insert, delete, move, text, not ${JSON.stringify((e as { op: unknown }).op)}`);
  }
}

// ---- reading history

/** the document's JSON as it was at `frontiers` (the document itself is left at its latest) */
export function jsonAt(d: LoroDoc, frontiers: Frontiers): any {
  d.checkout(frontiers);
  try {
    return jsonOf(d);
  } finally {
    d.checkoutToLatest();
  }
}

export type Change = { path: string; kind: "added" | "removed" | "changed"; from?: unknown; to?: unknown };

/**
 * What changed from `a` to `b`, field by field. Lists of objects with an `id` are followed by their ids (an item
 * added, removed or changed where it is), other lists item by item.
 */
export function diff(a: unknown, b: unknown, path = "$", out: Change[] = []): Change[] {
  if (canonical(a) === canonical(b)) return out;
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (!(k in b)) out.push({ path: `${path}.${k}`, kind: "removed", from: a[k] });
    for (const k of Object.keys(b)) {
      if (!(k in a)) out.push({ path: `${path}.${k}`, kind: "added", to: b[k] });
      else diff(a[k], b[k], `${path}.${k}`, out);
    }
    return out;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const ia = a.map(idOf), ib = b.map(idOf);
    if (ia.every((x) => x) && ib.every((x) => x)) {
      const byId = new Map(a.map((x, i) => [ia[i], x]));
      const kept = new Set(ib);
      for (const [i, x] of a.entries()) if (!kept.has(ia[i])) out.push({ path: `${path}[id=${ia[i]}]`, kind: "removed", from: x });
      for (const [i, x] of b.entries()) {
        if (!byId.has(ib[i])) out.push({ path: `${path}[id=${ib[i]}]`, kind: "added", to: x });
        else diff(byId.get(ib[i]), x, `${path}[id=${ib[i]}]`, out);
      }
      return out;
    }
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= a.length) out.push({ path: `${path}[${i}]`, kind: "added", to: b[i] });
      else if (i >= b.length) out.push({ path: `${path}[${i}]`, kind: "removed", from: a[i] });
      else diff(a[i], b[i], `${path}[${i}]`, out);
    }
    return out;
  }
  out.push({ path, kind: "changed", from: a, to: b });
  return out;
}

/** a frontier's key: its peers in order, canonical (two equal frontiers, one key) */
export const frontiersKey = (f: Frontiers): string => canonical([...f].sort((x, y) => (x.peer < y.peer ? -1 : 1)));
export const sameFrontiers = (a: Frontiers, b: Frontiers): boolean => frontiersKey(a) === frontiersKey(b);
