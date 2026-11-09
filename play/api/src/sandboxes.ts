// A sandbox's layout (play/SPEC.md §4.6, Samuel 2026-11-04 and 2026-11-06): what it draws (its pins: each slot an
// asset's accepted version, its variant and its values) and how it lays them out (its configs by name: Sandbox 1's
// garden, its plantings, spacing, drifts and fields; where a thing stands) is a document, `sandbox:<uuid>` (type
// sandbox/1, ./docs/schemas.ts), versioned like every other through ./versioned.ts: changed by an intent variant
// (doc_edit, propose_doc_version), its pin, pin_latest, unpin, set and delete the sandbox's own edit helpers; shown on
// the intents' board with each pin before and after, by its asset's label and version, and openable in the sandbox as
// it would be; accepted by an admin there. Accepting merges it into Main and writes Main's pins and configs to
// play.sandbox_pins and play.sandbox_configs, which the worlds read (/api/sandboxes/<uuid>/config) as before.
import type { Db, Queryable } from "./kit/pg";
import { admin, must, type Me } from "./access";
import { canonical } from "./kit/hash";
import { UUID } from "./kit/uuid";
import { readableRefs } from "./recipes";
import { assetSeen } from "./owners";
import * as docs from "./docs";
import { SCHEMA } from "./kit/ids";
import { applyEdits as applyDocEdits, jsonOf, newDoc, seed } from "./docs/core";
import { holdVariant, intentIdOf } from "./held";
import { noSuchIntent } from "./intents";
import { resolveEdits } from "./kinds";
import { HttpError } from "./kit/errors";
import { LOCK, lockSql } from "./kit/locks";

class SandboxError extends HttpError {}

const SLOT = /^[A-Za-z0-9][A-Za-z0-9_.\/-]{0,199}$/;
const CONFIG = /^[a-z][a-z0-9-]*$/;
const MOST_EDITS = 500;
const MOST_CONFIG = 1024 * 1024;

type Pin = { version: string; variant: string | null; params: Record<string, string> | null };
type SandboxState = { pins: Record<string, Pin>; configs: Record<string, unknown> };
type Key = string | number;

export 
/** only Maia City's admins change a sandbox, for now */
const SANDBOX_ADMINS = "Only Maia City's admins change a sandbox's layout, for now.";

async function sandboxRow(q: Queryable, sandbox: string) {
  if (!UUID.test(sandbox)) throw new SandboxError("A sandbox is named by its id, a UUID (list_sandboxes).", 404);
  const { rows } = await q.query<{ id: string; title: string; route: string; note: string }>(`SELECT id, title, route, note FROM play.sandboxes WHERE id = $1`, [sandbox]);
  if (!rows[0]) throw new SandboxError(`There is no sandbox ${sandbox}.`, 404);
  return rows[0];
}

/** a sandbox as it stands: its pins and its configs */
export async function stateOf(q: Queryable, sandbox: string): Promise<SandboxState> {
  const { rows: p } = await q.query<{ slot: string; version_id: string; variant: string | null; params: any }>(
    `SELECT slot, version_id, variant, params FROM play.sandbox_pins WHERE sandbox_id = $1 ORDER BY slot`, [sandbox],
  );
  const { rows: c } = await q.query<{ name: string; data: unknown }>(`SELECT name, data FROM play.sandbox_configs WHERE sandbox_id = $1 ORDER BY name`, [sandbox]);
  return {
    pins: Object.fromEntries(p.map((r) => [r.slot, { version: r.version_id, variant: r.variant, params: r.params ?? null }])),
    configs: Object.fromEntries(c.map((r) => [r.name, r.data])),
  };
}

/** every slot a config names (`{ slot }` anywhere in it), with where */
function slotsNamed(configs: Record<string, unknown>): { slot: string; config: string; path: Key[] }[] {
  const out: { slot: string; config: string; path: Key[] }[] = [];
  const walk = (o: unknown, config: string, path: Key[]) => {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, config, [...path, i]));
    else if (o && typeof o === "object") {
      if ("slot" in o && typeof o.slot === "string") out.push({ slot: o.slot, config, path });
      for (const [k, v] of Object.entries(o)) if (k !== "slot") walk(v, config, [...path, k]);
    }
  };
  for (const [name, data] of Object.entries(configs ?? {})) walk(data, name, []);
  return out;
}

/**
 * What the sandbox layout's schema (sandbox/1, migrations/schemas/sandbox.json) can't say, its hook: a pin's fields,
 * variant and values; a slot's and a config's names; a config at most 1 MB; every slot a config names pinned.
 */
export function sandboxCheck(doc: any): string[] {
  const out: string[] = [];
  for (const [slot, p] of Object.entries<any>(doc?.pins ?? {})) {
    if (!SLOT.test(slot)) out.push(`pins: ${slot} is not a slot's name`);
    if (p?.variant !== undefined && p.variant !== null && (typeof p.variant !== "string" || !p.variant)) out.push(`pins.${slot}.variant: a variant's name, or null`);
    if (p?.params !== undefined && p.params !== null) {
      if (typeof p.params !== "object" || Array.isArray(p.params)) out.push(`pins.${slot}.params: an object of values, or null`);
      else for (const [k, v] of Object.entries(p.params)) if (typeof v !== "string") out.push(`pins.${slot}.params.${k}: a value is kept as a string`);
    }
  }
  for (const [name, data] of Object.entries(doc?.configs ?? {})) {
    if (!CONFIG.test(name) || name === "assets") out.push(`configs: ${name} is not a config's name`);
    if (Buffer.byteLength(JSON.stringify(data)) > MOST_CONFIG) out.push(`configs.${name}: larger than 1 MB`);
  }
  for (const s of slotsNamed(doc?.configs ?? {})) if (!doc?.pins?.[s.slot]) out.push(`configs.${s.config}${s.path.map((k) => (typeof k === "number" ? `[${k}]` : `.${k}`)).join("")} names slot ${s.slot}, which the sandbox does not pin`);
  return out;
}

type VersionRow = { id: string; asset_id: string; grp: string; slug: string; label: string; number: number; default_variant: string | null; variants: string[]; params: any[]; private: boolean };
async function versionInfo(q: Queryable, ids: string[]): Promise<Map<string, VersionRow>> {
  if (!ids.length) return new Map();
  const { rows } = await q.query<VersionRow>(
    `SELECT v.id, v.asset_id, a.grp, a.slug, a.label, v.number, v.default_variant, NOT ${assetSeen("a", "NULL")} AS private,
            COALESCE((SELECT array_agg(x.name ORDER BY x.name) FROM play.asset_variants x WHERE x.version_id = v.id), '{}') AS variants,
            COALESCE(v.card->'card'->'params', '[]') AS params
       FROM play.asset_versions v JOIN play.assets a ON a.id = v.asset_id WHERE v.id = ANY($1)`,
    [[...new Set(ids)]],
  );
  return new Map(rows.map((r) => [r.id, r]));
}

/** an asset's accepted version: by its number, or its head */
async function acceptedVersion(q: Queryable, asset: string, number?: number) {
  if (!UUID.test(`${asset}`)) throw new SandboxError("Name the asset by its id (a UUID, from list_assets).");
  // a private asset is pinned by no sandbox (worlds are shared: ./owners.ts), and is refused as one that never was
  const { rows } = await q.query<{ id: string; number: number }>(
    number == null
      ? `SELECT v.id, v.number FROM play.assets a JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1 AND v.number IS NOT NULL AND ${assetSeen("a", "NULL")}`
      : `SELECT v.id, v.number FROM play.asset_versions v JOIN play.assets a ON a.id = v.asset_id WHERE v.asset_id = $1 AND v.number = $2 AND ${assetSeen("a", "NULL")}`,
    number == null ? [asset] : [asset, number],
  );
  if (!rows[0]) throw new SandboxError(`${number == null ? "There is no such asset, or it has no accepted version" : `The asset has no accepted version ${number}`} that a sandbox may pin (a private asset is pinned by none: worlds are shared).`, 404);
  return rows[0];
}

function paramsOf(v: unknown): Record<string, string> | null {
  if (v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) throw new SandboxError("A pin's params are an object of values ({ stage: 9 }).");
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v as object)) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(k)) throw new SandboxError(`${k} is not a parameter's name.`);
    if (typeof x !== "string" && typeof x !== "number") throw new SandboxError(`${k}: a value is a number or a string.`);
    out[k] = `${x}`;
  }
  return Object.keys(out).length ? out : null;
}

function pathOf(p: unknown): Key[] {
  if (p === undefined) return [];
  if (!Array.isArray(p) || p.length > 32 || p.some((k) => !(typeof k === "string" || (Number.isInteger(k) && k >= 0))))
    throw new SandboxError("A path is a list of keys and array indexes, e.g. ['outside', 'trees', 0, 'weight'].");
  return p as Key[];
}

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const at = (o: unknown, path: Key[]) => path.reduce<any>((x, k) => (x == null ? undefined : x[k]), o);

/** sets (or with `value` undefined, deletes) the value at `path` of `root`, refusing a path that is not there */
function put(root: any, path: Key[], value: unknown, where: string) {
  let o = root;
  for (let i = 0; i < path.length - 1; i++) {
    o = o?.[path[i]];
    if (o === null || typeof o !== "object") throw new SandboxError(`${where}: ${path.slice(0, i + 1).join("/")} is not there.`);
  }
  const k = path[path.length - 1];
  if (Array.isArray(o)) {
    if (typeof k !== "number") throw new SandboxError(`${where}: an array is indexed by number.`);
    if (value === undefined) {
      if (k >= o.length) throw new SandboxError(`${where}: there is no item ${k}.`);
      o.splice(k, 1);
    } else {
      if (k > o.length) throw new SandboxError(`${where}: item ${k} is past the end (${o.length} to add one).`);
      o[k] = value;
    }
  } else {
    if (typeof k !== "string") throw new SandboxError(`${where}: ${path.slice(0, -1).join("/") || "it"} is not an array.`);
    if (value === undefined) {
      if (!(k in o)) throw new SandboxError(`${where}: ${path.join("/")} is not there.`);
      delete o[k];
    } else o[k] = value;
  }
}

type Change =
  | { kind: "pin"; slot: string; before: Pin | null; after: Pin | null }
  | { kind: "config"; config: string; path: Key[]; before: unknown; after: unknown };

/** the edits applied in order to `from`, checked: the sandbox as it would be, and what each edit changed */
export async function applyEdits(q: Queryable, from: SandboxState, edits: unknown): Promise<{ state: SandboxState; changes: Change[] }> {
  if (!Array.isArray(edits) || !edits.length) throw new SandboxError("Give the edits, a list of at least one.");
  if (edits.length > MOST_EDITS) throw new SandboxError(`At most ${MOST_EDITS} edits a proposal.`);
  const state: SandboxState = clone(from);
  const changes: Change[] = [];
  const firstPin = new Map<string, Pin | null>();
  const pinChanged = (slot: string, before: Pin | null) => {
    if (!firstPin.has(slot)) firstPin.set(slot, before);
  };
  for (const [i, e] of edits.entries()) {
    const where = `Edit ${i + 1} (${e?.op ?? "?"})`;
    if (!e || typeof e !== "object") throw new SandboxError(`${where}: an edit is an object.`);
    if (e.op === "pin") {
      const slot = `${e.slot ?? ""}`;
      if (!SLOT.test(slot)) throw new SandboxError(`${where}: ${slot || "the slot"} is not a slot's name.`);
      const was = state.pins[slot] ?? null;
      const was_asset = was ? (await versionInfo(q, [was.version])).get(was.version)!.asset_id : null;
      const asset = e.asset ?? was_asset;
      if (!asset) throw new SandboxError(`${where}: ${slot} is a new slot: name its asset.`);
      const v = await acceptedVersion(q, `${asset}`, e.version == null ? undefined : Number(e.version));
      const info = (await versionInfo(q, [v.id])).get(v.id)!;
      // its variant: as given (null: the version's default), else the one it had where the new version has it
      let variant: string | null = e.variant === undefined ? (was?.variant ?? null) : e.variant === null ? null : `${e.variant}`;
      if (variant !== null && !info.variants.includes(variant)) {
        if (e.variant === undefined) variant = null;
        else throw new SandboxError(`${where}: ${info.grp}/${info.slug}@${info.number} has no variant ${variant}${info.variants.length ? ` (it has ${info.variants.join(", ")})` : ""}.`);
      }
      const params = e.params === undefined ? (was?.params ?? null) : paramsOf(e.params);
      pinChanged(slot, was);
      state.pins[slot] = { version: v.id, variant, params };
    } else if (e.op === "pin_latest") {
      const head = await acceptedVersion(q, `${e.asset ?? ""}`);
      const info = (await versionInfo(q, [head.id])).get(head.id)!;
      const pinned = await versionInfo(q, Object.values(state.pins).map((p) => p.version));
      const slots = Object.entries(state.pins).filter(([, p]) => pinned.get(p.version)?.asset_id === info.asset_id);
      if (!slots.length) throw new SandboxError(`${where}: the sandbox pins no ${info.grp}/${info.slug}.`);
      for (const [slot, was] of slots) {
        let variant = e.variant === undefined ? was.variant : e.variant === null ? null : `${e.variant}`;
        if (variant !== null && !info.variants.includes(variant)) {
          if (e.variant === undefined) variant = null;
          else throw new SandboxError(`${where}: ${info.grp}/${info.slug}@${info.number} has no variant ${variant}.`);
        }
        pinChanged(slot, was);
        state.pins[slot] = { ...was, version: head.id, variant };
      }
    } else if (e.op === "unpin") {
      const slot = `${e.slot ?? ""}`;
      if (!state.pins[slot]) throw new SandboxError(`${where}: the sandbox pins no slot ${slot}.`);
      pinChanged(slot, state.pins[slot]);
      delete state.pins[slot];
    } else if (e.op === "set" || e.op === "delete") {
      const config = `${e.config ?? ""}`;
      if (!CONFIG.test(config) || config === "assets") throw new SandboxError(`${where}: ${config || "the config"} is not a config's name.`);
      const path = pathOf(e.path);
      const before = clone(path.length ? at(state.configs[config], path) : state.configs[config]);
      if (e.op === "set") {
        if (e.value === undefined) throw new SandboxError(`${where}: give the value to set.`);
        const readable = readableRefs(e.value, "");
        if (readable.length) throw new SandboxError(`${where}: a config names an asset by a slot of the sandbox's pins ({ slot }), not ${readable[0]}.`);
        const value = clone(e.value);
        if (!path.length) {
          if (!value || typeof value !== "object" || Array.isArray(value)) throw new SandboxError(`${where}: a whole config is an object.`);
          state.configs[config] = value;
        } else {
          if (state.configs[config] === undefined) throw new SandboxError(`${where}: the sandbox has no config ${config} (set it whole first, path []).`);
          put(state.configs[config], path, value, where);
        }
      } else {
        if (state.configs[config] === undefined) throw new SandboxError(`${where}: the sandbox has no config ${config}.`);
        if (!path.length) delete state.configs[config];
        else put(state.configs[config], path, undefined, where);
      }
      changes.push({ kind: "config", config, path, before, after: clone(path.length ? at(state.configs[config], path) : state.configs[config]) });
    } else throw new SandboxError(`${where}: the ops are pin, pin_latest, unpin, set and delete.`);
  }
  for (const [name, data] of Object.entries(state.configs))
    if (Buffer.byteLength(JSON.stringify(data)) > MOST_CONFIG) throw new SandboxError(`The config ${name} would be larger than 1 MB.`);
  // every slot a config names is pinned
  const missing = slotsNamed(state.configs).filter((s) => !state.pins[s.slot]);
  if (missing.length) throw new SandboxError(`${missing[0].config}/${missing[0].path.join("/")} names slot ${missing[0].slot}, which the sandbox would not pin: pin it, or change that too.`);
  const pinChanges: Change[] = [];
  for (const [slot, before] of firstPin) {
    const after = state.pins[slot] ?? null;
    if (canonical(before) !== canonical(after)) pinChanges.push({ kind: "pin", slot, before, after });
  }
  return { state, changes: [...pinChanges, ...changes] };
}

/** what the changes are, for people: each pin's asset, version and variant named */
async function shown(q: Queryable, changes: Change[]) {
  const ids = changes.flatMap((c) => (c.kind === "pin" ? [c.before?.version, c.after?.version].filter(Boolean) as string[] : []));
  const info = await versionInfo(q, ids);
  const pin = (p: Pin | null) => {
    if (!p) return null;
    const v = info.get(p.version)!;
    return { asset: v.asset_id, group: v.grp, slug: v.slug, label: v.label, number: v.number, version: p.version, variant: p.variant ?? null, usedVariant: p.variant ?? v.default_variant, params: p.params };
  };
  return changes.map((c) => (c.kind === "pin" ? { kind: "pin", slot: c.slot, before: pin(c.before), after: pin(c.after) } : c));
}

/** a sandbox as an agent reads it: each pin with the asset it draws (and its newest version), its configs whole */
export async function sandboxOf(db: Queryable, me: Me | null, sandbox: string) {
  must(me, "read", "sandboxes");
  const s = await sandboxRow(db, sandbox);
  const state = await stateOf(db, sandbox);
  const info = await versionInfo(db, Object.values(state.pins).map((p) => p.version));
  const { rows: heads } = await db.query<{ id: string; number: number }>(
    `SELECT a.id, v.number FROM play.assets a JOIN play.asset_versions v ON v.id = a.head WHERE a.id = ANY($1)`,
    [[...new Set([...info.values()].map((v) => v.asset_id))]],
  );
  const headOf = new Map(heads.map((h) => [h.id, h.number]));
  const named = slotsNamed(state.configs);
  return {
    ...s,
    pins: Object.entries(state.pins).map(([slot, p]) => {
      const v = info.get(p.version)!;
      return {
        slot, asset: v.asset_id, group: v.grp, slug: v.slug, label: v.label, number: v.number, latest: headOf.get(v.asset_id) ?? null,
        variant: p.variant, variants: v.variants, defaultVariant: v.default_variant, params: p.params,
        usedBy: named.filter((n) => n.slot === slot).map((n) => ({ config: n.config, path: n.path })),
      };
    }),
    configs: state.configs,
  };
}

export async function listSandboxes(db: Queryable, me: Me | null) {
  must(me, "read", "sandboxes");
  const { rows } = await db.query(
    `SELECT s.id, s.title, s.route, s.note, (SELECT count(*)::int FROM play.sandbox_pins p WHERE p.sandbox_id = s.id) AS pins,
            COALESCE((SELECT array_agg(c.name ORDER BY c.name) FROM play.sandbox_configs c WHERE c.sandbox_id = s.id), '{}') AS configs
       FROM play.sandboxes s ORDER BY s.title, s.id`,
  );
  return rows;
}

// ---- the layout as a document (./versioned.ts's kind `sandbox`)

/** a sandbox's layout document: sandbox:<its uuid> */
const layoutDoc = (sandbox: string) => `sandbox:${sandbox}`;

/** a sandbox's layout as its rows hold it, as the document's state */
export async function layoutOf(q: Queryable, sandbox: string) {
  const s = await sandboxRow(q, sandbox);
  const { pins, configs } = await stateOf(q, sandbox);
  return { schema: "sandbox/1", title: s.title, pins, configs };
}

/** A sandbox's layout document made where it is missing: its v1 the layout its rows hold. Gives back whether it was made. */
export async function ensureLayoutDoc(q: Queryable, sandbox: string): Promise<boolean> {
  const { rows } = await q.query(`SELECT 1 FROM play.docs WHERE id = $1`, [layoutDoc(sandbox)]);
  if (rows.length) return false;
  const note = "The layout as it stood when it became a document";
  await docs.createDoc(q, { id: layoutDoc(sandbox), schema: SCHEMA.sandbox, json: await layoutOf(q, sandbox), author: { human: null, via: "system" }, message: `v1: ${note}`, version: note });
  return true;
}

/** what a layout holds that play does not (a pin of a version that is no accepted version, or a variant it lacks): each problem said */
async function layoutProblems(q: Queryable, json: any): Promise<string[]> {
  const pins = Object.entries<Pin>(json?.pins ?? {});
  const info = await versionInfo(q, pins.map(([, p]) => p.version));
  const out: string[] = [];
  for (const [slot, p] of pins) {
    const v = info.get(p.version);
    if (!v || v.number == null || v.private) out.push(`${slot} pins ${p.version}, which is no accepted version of an asset a sandbox may pin (a private asset is pinned by none: worlds are shared)`);
    else if (p.variant != null && !v.variants.includes(p.variant)) out.push(`${slot}: ${v.grp}/${v.slug}@${v.number} has no variant ${p.variant}`);
  }
  for (const [name, data] of Object.entries(json?.configs ?? {})) {
    const readable = readableRefs(data, "");
    if (readable.length) out.push(`the config ${name} names an asset by ${readable[0]}: a config names one by a slot of the sandbox's pins ({ slot })`);
  }
  return out;
}

const HELPERS = new Set(["pin", "pin_latest", "unpin"]);
/** one of the sandbox's own edit helpers (pin, pin_latest, unpin; set and delete of a config), not a document's edit */
const isHelper = (e: any) => !!e && typeof e === "object" && (HELPERS.has(e.op) || ((e.op === "set" || e.op === "delete") && typeof e.config === "string"));

/**
 * An edit of a layout as the document's own: the sandbox's edit helpers applied to it as it stands (each pin checked
 * against the asset's accepted versions and variants), a document's edits (set, insert, delete, move by path), or the
 * whole layout; what it would hold that play does not is refused.
 */
export async function layoutWrite(q: Queryable, cur: any, input: { edits?: unknown; whole?: unknown }): Promise<docs.Write> {
  try {
    let target: any;
    if (input.whole !== undefined) {
      if (!input.whole || typeof input.whole !== "object" || Array.isArray(input.whole)) throw new HttpError("A whole layout is an object (doc_at's `json`).");
      target = { ...(input.whole as object), schema: cur.schema };
    } else if (Array.isArray(input.edits) && input.edits.length && input.edits.every(isHelper)) {
      const { state } = await applyEdits(q, { pins: cur.pins ?? {}, configs: cur.configs ?? {} }, input.edits);
      target = { ...cur, pins: state.pins, configs: state.configs };
    } else {
      if (Array.isArray(input.edits) && input.edits.some(isHelper)) throw new HttpError("Give the sandbox's edit helpers (pin, pin_latest, unpin, set and delete of a config) or a document's edits, not both in one edit.");
      // a document's edits, applied to the layout as it stands to check what they make
      const t = await docs.typeFor(q, SCHEMA.sandbox);
      const d = newDoc();
      seed(d, t, cur);
      applyDocEdits(d, t, resolveEdits(cur, input.edits));
      target = jsonOf(d);
    }
    const problems = await layoutProblems(q, target);
    if (problems.length) throw new HttpError(problems[0]);
    return { target };
  } catch (e) {
    throw e instanceof SandboxError ? new HttpError(e.message, e.status) : e;
  }
}

/** each slot whose pin two layouts hold differently, before and after, its asset named by its label and version */
async function pinChanges(q: Queryable, before: Record<string, Pin | null>, after: Record<string, Pin | null>) {
  const slots = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].sort();
  const changes: Change[] = [];
  for (const slot of slots) {
    const b = before?.[slot] ?? null, a = after?.[slot] ?? null;
    if (canonical(b) !== canonical(a)) changes.push({ kind: "pin", slot, before: b, after: a });
  }
  return shownPins(q, changes);
}
async function shownPins(q: Queryable, changes: Change[]) {
  const ids = changes.flatMap((c) => (c.kind === "pin" ? ([c.before?.version, c.after?.version].filter(Boolean) as string[]) : []));
  const info = await versionInfo(q, ids);
  const pin = (p: Pin | null) => {
    if (!p) return null;
    const v = info.get(p.version);
    if (!v) return { asset: null, group: null, slug: null, label: null, number: null, version: p.version, variant: p.variant ?? null, usedVariant: p.variant ?? null, params: p.params ?? null };
    return { asset: v.asset_id, group: v.grp, slug: v.slug, label: v.label, number: v.number, version: p.version, variant: p.variant ?? null, usedVariant: p.variant ?? v.default_variant, params: p.params ?? null };
  };
  return changes.filter((c) => c.kind === "pin").map((c: any) => ({ slot: c.slot, before: pin(c.before), after: pin(c.after) }));
}

/** a layout as a read shows it beside its `json`: each pin by its asset's label and version, and where its world is */
export async function layoutView(q: Queryable, json: any, sandbox: string) {
  const { route } = await sandboxRow(q, sandbox);
  const pins = Object.entries<Pin>(json?.pins ?? {});
  const info = await versionInfo(q, pins.map(([, p]) => p.version));
  return {
    route,
    pins: pins.map(([slot, p]) => {
      const v = info.get(p.version);
      return { slot, asset: v?.asset_id ?? null, group: v?.grp ?? null, slug: v?.slug ?? null, label: v?.label ?? null, number: v?.number ?? null, variant: p.variant ?? null, usedVariant: p.variant ?? v?.default_variant ?? null, params: p.params ?? null };
    }),
  };
}
/** what a layout's change shows beside its field diff: each pin before and after, by its asset's label and version */
export async function layoutShown(q: Queryable, before: any, after: any) {
  return { pins: await pinChanges(q, before?.pins ?? {}, after?.pins ?? {}) };
}

/** a layout change kept from before layouts were documents (migration 0033): its edits and what they changed */
type Kept = { edits: unknown; diff: Change[] | null; holds?: boolean; why?: string };

/**
 * A layout's intent variant as people review it, beside its changes field by field (./review.ts reviewDoc): each pin
 * before and after by its asset's label and version, whether it still holds on the layout as it is now (accepting
 * would merge it so), and the sandbox to open as it would be.
 */
export async function layoutReview(q: Queryable, p: any) {
  const docId = p.doc_id as string, sandbox = docId.split(":")[1];
  const s = await sandboxRow(q, sandbox);
  const shown = { ...s, open: `${s.route}?layout=${encodeURIComponent(`${sandbox}/${p.id}`)}` };
  if (p.doc_variant == null) return { sandbox: shown, pins: [], holds: true, why: null };
  const v = Number(p.doc_variant);
  const { rows } = await q.query<{ review: Kept | null }>(`SELECT review FROM play.doc_variants WHERE id = $1`, [v]);
  const kept = rows[0]?.review ?? null;
  if (kept && !(await docs.history(q, docId, { variant: v })).length) {
    // a change made before the layout was a document: what it changed, as it was kept
    const diff = kept.diff ?? [];
    const path = (c: any) => `$.configs.${c.config}${(c.path ?? []).map((k: any) => (typeof k === "number" ? `[${k}]` : `.${k}`)).join("")}`;
    const changes = [
      ...diff.filter((c) => c.kind === "pin").map((c: any) => ({ path: `$.pins.${c.slot}`, kind: c.before == null ? "added" : c.after == null ? "removed" : "changed", from: c.before ?? undefined, to: c.after ?? undefined })),
      ...diff.filter((c) => c.kind === "config").map((c: any) => ({ path: path(c), kind: c.before === undefined ? "added" : c.after === undefined ? "removed" : "changed", from: c.before, to: c.after })),
    ];
    return { sandbox: shown, pins: await shownPins(q, diff), changes, holds: kept.holds ?? true, why: kept.why ?? null, kept: { edits: kept.edits } };
  }
  const before = await docs.seedOf(q, docId, v);
  const after = (await docs.readDoc(q, docId, { variant: v })).json;
  const pins = await pinChanges(q, before?.pins ?? {}, after?.pins ?? {});
  let holds = true, why: string | null = null;
  if (p.status === "proposal") {
    const merged = await docs.previewMerge(q, docId, v);
    const problems = [...merged.problems, ...(await layoutProblems(q, merged.json))];
    if (problems.length) (holds = false), (why = problems[0]);
  }
  return { sandbox: shown, pins, holds, why };
}

/** the rows the worlds read, written from a layout (in the caller's transaction) */
export async function writeRows(tx: Queryable, sandbox: string, json: any) {
  const pins = Object.entries<Pin>(json.pins ?? {});
  await tx.query(`DELETE FROM play.sandbox_pins WHERE sandbox_id = $1 AND NOT (slot = ANY($2))`, [sandbox, pins.map(([s]) => s)]);
  for (const [slot, p] of pins)
    await tx.query(
      `INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id, variant, params) VALUES ($1, $2, $3, $4, ($5::text)::jsonb)
       ON CONFLICT (sandbox_id, slot) DO UPDATE SET version_id = EXCLUDED.version_id, variant = EXCLUDED.variant, params = EXCLUDED.params`,
      [sandbox, slot, p.version, p.variant ?? null, p.params ? JSON.stringify(p.params) : null],
    );
  const configs = Object.entries<unknown>(json.configs ?? {});
  await tx.query(`DELETE FROM play.sandbox_configs WHERE sandbox_id = $1 AND NOT (name = ANY($2))`, [sandbox, configs.map(([n]) => n)]);
  for (const [name, data] of configs)
    await tx.query(
      `INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ($1, $2, ($3::text)::jsonb)
       ON CONFLICT (sandbox_id, name) DO UPDATE SET data = EXCLUDED.data, updated = now() WHERE play.sandbox_configs.data IS DISTINCT FROM EXCLUDED.data`,
      [sandbox, name, JSON.stringify(data)],
    );
}

/**
 * What a layout's Accept holds it to first (./kinds.ts before), in the Accept's transaction, its sandbox's row locked:
 * one that no longer holds on the layout as it is (a pin of a version or variant play no longer keeps; one kept from
 * before layouts were documents that no longer held then) is archived, saying why. Accepted, Main's pins and configs
 * are written to the rows the worlds read (writeRows, its accepted hook).
 */
export async function layoutBefore(tx: Queryable, docId: string, v: number, merged: any): Promise<string | null> {
  await tx.query(`SELECT 1 FROM play.sandboxes WHERE id = $1 FOR UPDATE`, [docId.split(":")[1]]);
  const empty = !(await docs.history(tx, docId, { variant: v })).length;
  const problems = empty ? ["it no longer held on the layout when the layout became a document"] : await layoutProblems(tx, merged);
  return problems.length ? `Merged into the layout as it is now, this no longer holds: ${problems[0]}. Propose it again on its newest version.` : null;
}

/** The sandbox at a version or an edit of its layout's history, to walk it so (admins; `?v=` or `?edit=` on its config). */
export async function layoutAt(db: Queryable, me: Me | null, sandbox: string, at: { version: number } | { edit: number }): Promise<SandboxState> {
  admin(me, SANDBOX_ADMINS);
  const n = "version" in at ? at.version : at.edit;
  if (!Number.isInteger(n) || n < 1) throw new HttpError("A version or an edit is named by its number.", 404);
  await ensureLayoutDoc(db, sandbox);
  const json = await docs.stateAt(db, layoutDoc(sandbox), at).catch((e) => {
    throw e instanceof docs.DocError ? new HttpError(e.message, 404) : e;
  });
  return { pins: json.pins ?? {}, configs: json.configs ?? {} };
}

/**
 * The sandbox as an intent's change at Proposal would make it, to open it so before deciding (admins; `?intent=` on its
 * config): its intent variant merged into the layout as it is now, as accepting would make it.
 */
export async function proposedState(db: Queryable, me: Me | null, sandbox: string, id: string): Promise<SandboxState> {
  admin(me, SANDBOX_ADMINS);
  const intent = await intentIdOf(db, id);
  if (!intent) throw noSuchIntent();
  const { rows } = await db.query<{ stage: string; doc_variant: string | null }>(`SELECT i.stage, iv.variant_id AS doc_variant FROM play.intents i JOIN play.intent_variants iv ON iv.intent_id = i.id WHERE i.id = $1 AND iv.doc_id = $2`, [intent, layoutDoc(sandbox)]);
  if (!rows[0]) throw new HttpError("There is no such intent's change of this sandbox.", 404);
  if ((rows[0].stage !== "proposal" && rows[0].stage !== "build") || rows[0].doc_variant == null) return stateOf(db, sandbox);
  const merged = (await docs.previewMerge(db, layoutDoc(sandbox), Number(rows[0].doc_variant))).json;
  if ((await layoutProblems(db, merged)).length) throw new HttpError("It no longer holds on the layout as it is now.", 404);
  return { pins: merged.pins ?? {}, configs: merged.configs ?? {} };
}

/**
 * play's seed (./seed.ts), after ensureSchemas (migration 202611070115-d2f50bf1-sandbox-layouts kept what SQL can't
 * write): every sandbox with pins, configs or a change kept gets its layout document, its v1 its pins and configs as
 * they are, and every kept change (play.sandbox_changes_kept) becomes an intent variant of it, each intent keeping its
 * stage. One at Proposal is its edits made again on v1 and proposed (kept, to be archived on Accept, where they no
 * longer hold); an accepted or archived one a closed variant that keeps what it changed as its review. Each change is
 * moved once, in its own transaction under one advisory lock (play-api and the import migrate at once on a deploy).
 */
export async function ensureLayouts(db: Db): Promise<number> {
  const { rows: has } = await db.query(`SELECT to_regclass('play.sandbox_changes_kept') AS t`);
  if (!has[0]?.t) return 0;
  return db.transaction(async (q) => {
    await q.query(lockSql(LOCK.layoutsMove));
    const { rows: sandboxes } = await q.query<{ id: string }>(
      `SELECT s.id FROM play.sandboxes s
        WHERE NOT EXISTS (SELECT 1 FROM play.docs d WHERE d.id = 'sandbox:' || s.id::text)
          AND (EXISTS (SELECT 1 FROM play.sandbox_pins p WHERE p.sandbox_id = s.id) OR EXISTS (SELECT 1 FROM play.sandbox_configs c WHERE c.sandbox_id = s.id)
               OR EXISTS (SELECT 1 FROM play.sandbox_changes_kept k WHERE k.sandbox_id = s.id AND NOT k.moved))
        ORDER BY s.id`,
    );
    for (const s of sandboxes) await ensureLayoutDoc(q, s.id);
    const { rows: kept } = await q.query<any>(
      `SELECT k.intent_id AS id, k.sandbox_id, k.edits, k.diff, i.stage, COALESCE(i.work_note, '') AS note, i.proposed_by, i.proposed_via, i.proposed_at, i.decided_by, i.decided_at
         FROM play.sandbox_changes_kept k JOIN play.intents i ON i.id = k.intent_id WHERE NOT k.moved ORDER BY i.proposed_at, k.intent_id`,
    );
    for (const i of kept) {
      const docId = layoutDoc(i.sandbox_id);
      const author: docs.Author = { human: i.proposed_by ?? null, via: i.proposed_via === "mcp" ? "mcp" : "site" };
      const v = (await docs.variant(q, docId, { author, note: i.note })).id;
      const review: Kept = { edits: i.edits, diff: i.diff ?? null };
      const status = i.stage === "accepted" ? "accepted" : i.stage === "proposal" ? "proposed" : "archived";
      if (i.stage === "proposal") {
        try {
          const cur = (await docs.readDoc(q, docId, { variant: v })).json;
          const { state, changes } = await applyEdits(q, { pins: cur.pins, configs: cur.configs }, i.edits);
          review.diff = changes;
          const e = await docs.commit(q, docId, { variant: v, target: { ...cur, pins: state.pins, configs: state.configs }, message: i.note.split("\n")[0].slice(0, 500) || "the change", author });
          if (e) await docs.propose(q, docId, v, { note: i.note, author });
          else (review.holds = false), (review.why = "These edits change nothing on the layout as it is.");
        } catch (e) {
          if (!(e instanceof SandboxError)) throw e;
          review.holds = false;
          review.why = e.message;
        }
      }
      await q.query(
        `UPDATE play.doc_variants SET status = $2, review = ($3::text)::jsonb, intent_id = $4, created = COALESCE($5, created),
                proposed_at = COALESCE(proposed_at, $5), decided_by = $6, decided_at = $7 WHERE id = $1`,
        [v, status, JSON.stringify(review), i.id, i.proposed_at, i.stage === "proposal" ? null : i.decided_by, i.stage === "proposal" ? null : i.decided_at],
      );
      await holdVariant(q, null, i.id, docId, v);
      await q.query(`UPDATE play.sandbox_changes_kept SET moved = true WHERE intent_id = $1`, [i.id]);
    }
    return kept.length;
  });
}
