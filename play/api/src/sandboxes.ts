// A sandbox's layout, changed only by proposal (Samuel 2026-11-04): what it draws (its pins: each slot an asset's
// accepted version, its variant and its values) and how it lays them out (its configs by name: Sandbox 1's garden, its
// plantings, spacing, drifts and fields; where a thing stands), proposed over MCP as edits (`sandbox_change`), shown on
// the Proposals page as what each edit changes, before and after, and openable in the sandbox as it would be. An admin
// accepts it there; nothing over MCP accepts. Accepting applies the edits to the sandbox as it is then, in one
// transaction: an edit that no longer holds (its slot gone, its path gone) archives the proposal instead.
import { randomUUID } from "node:crypto";
import type { Db, Queryable } from "./pg";
import { COOP, Denied, must, type Me } from "./access";
import { canonical, hashText } from "./hash";
import { NOTE_MOST } from "./notes";
import { UUID } from "./uuid";
import { readableRefs } from "../import/plan";
import { NotFound } from "./assets";

export class SandboxError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const SLOT = /^[A-Za-z0-9][A-Za-z0-9_.\/-]{0,199}$/;
const CONFIG = /^[a-z][a-z0-9-]*$/;
const MOST_EDITS = 500;
const MOST_CONFIG = 1024 * 1024;

type Pin = { version: string; variant: string | null; params: Record<string, string> | null };
export type SandboxState = { pins: Record<string, Pin>; configs: Record<string, unknown> };
type Key = string | number;

export type SandboxEdit =
  | { op: "pin"; slot: string; asset?: string; version?: number; variant?: string | null; params?: Record<string, unknown> | null }
  | { op: "pin_latest"; asset: string; variant?: string | null }
  | { op: "unpin"; slot: string }
  | { op: "set"; config: string; path?: Key[]; value: unknown }
  | { op: "delete"; config: string; path?: Key[] };

/** only Maia City's admins change a sandbox, for now */
function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins change a sandbox's layout, for now.");
  return me;
}

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
const stateHash = (s: SandboxState) => hashText(canonical(s));

/** every slot a config names (`{ slot }` anywhere in it), with where */
function slotsNamed(configs: Record<string, unknown>) {
  const out: { slot: string; config: string; path: Key[] }[] = [];
  const walk = (o: unknown, config: string, path: Key[]) => {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, config, [...path, i]));
    else if (o && typeof o === "object") {
      if (typeof (o as any).slot === "string") out.push({ slot: (o as any).slot, config, path });
      for (const [k, v] of Object.entries(o)) if (k !== "slot") walk(v, config, [...path, k]);
    }
  };
  for (const [name, data] of Object.entries(configs)) walk(data, name, []);
  return out;
}

type VersionRow = { id: string; asset_id: string; grp: string; slug: string; label: string; number: number; default_variant: string | null; variants: string[]; params: any[] };
async function versionInfo(q: Queryable, ids: string[]): Promise<Map<string, VersionRow>> {
  if (!ids.length) return new Map();
  const { rows } = await q.query<VersionRow>(
    `SELECT v.id, v.asset_id, a.grp, a.slug, a.label, v.number, v.default_variant,
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
  const { rows } = await q.query<{ id: string; number: number }>(
    number == null
      ? `SELECT v.id, v.number FROM play.assets a JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1 AND v.number IS NOT NULL`
      : `SELECT v.id, v.number FROM play.asset_versions v WHERE v.asset_id = $1 AND v.number = $2`,
    number == null ? [asset] : [asset, number],
  );
  if (!rows[0]) throw new SandboxError(number == null ? "There is no such asset, or it has no accepted version." : `The asset has no accepted version ${number}.`, 404);
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
  for (const [i, e] of (edits as any[]).entries()) {
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

/** propose a change of a sandbox's layout: the edits, checked against it as it stands */
export async function proposeSandbox(db: Db, me: Me | null, body: { sandbox?: string; note?: string; edits?: unknown; base?: string; intent?: string }, via: "web" | "mcp" = "mcp") {
  const who = admin(me);
  const sandbox = `${body?.sandbox ?? ""}`;
  await sandboxRow(db, sandbox);
  const note = `${body?.note ?? ""}`.trim().slice(0, NOTE_MOST);
  if (!note) throw new SandboxError("Say what the change is and why, for the admins deciding (note).");
  const from = await stateOf(db, sandbox);
  const base = stateHash(from);
  if (body.base !== undefined && body.base !== base) throw new SandboxError("The sandbox changed since you read it: read it again (get_sandbox) and make the change on it.", 409);
  const { changes } = await applyEdits(db, from, body.edits);
  if (!changes.length) throw new SandboxError("These edits change nothing.");
  const id = randomUUID();
  await db.query(
    `INSERT INTO play.proposals (id, coop_id, kind, sandbox_id, sandbox_base, sandbox_change, sandbox_diff, author, note, via, intent_id)
     VALUES ($1, $2, 'sandbox_change', $3, $4, ($5::text)::jsonb, ($6::text)::jsonb, $7, $8, $9, $10)`,
    [id, COOP, sandbox, base, JSON.stringify(body.edits), JSON.stringify(changes), who.id, note, via, body.intent ?? null],
  );
  return { id, sandbox, changes: await shown(db, changes) };
}

/** a sandbox change as people review it: what each edit changes, before and after */
export async function sandboxReview(db: Queryable, p: any) {
  const s = await sandboxRow(db, p.sandbox_id);
  let changes: Change[] = p.sandbox_diff ?? [];
  let holds = true;
  let why: string | null = null;
  // an open one: against the sandbox as it is now, as accepting would apply it
  if (p.status === "proposal") {
    const now = await stateOf(db, p.sandbox_id);
    try {
      changes = (await applyEdits(db, now, p.sandbox_change)).changes;
    } catch (e) {
      if (!(e instanceof SandboxError)) throw e;
      holds = false;
      why = e.message;
    }
  }
  return { sandbox: s, edits: p.sandbox_change, changes: await shown(db, changes), holds, why, moved: p.status === "proposal" && stateHash(await stateOf(db, p.sandbox_id)) !== p.sandbox_base };
}

/** accept or archive a sandbox change: accepted, its edits applied to the sandbox as it is, in this transaction */
export async function decideSandbox(tx: Queryable, me: Me, p: any, verdict: "accept" | "archive") {
  admin(me);
  if (verdict === "archive") {
    await tx.query(`UPDATE play.proposals SET status = 'archived', decided_by = $2, decided_at = now() WHERE id = $1`, [p.id, me.id]);
    return { id: p.id, status: "archived" };
  }
  await tx.query(`SELECT 1 FROM play.sandboxes WHERE id = $1 FOR UPDATE`, [p.sandbox_id]);
  const now = await stateOf(tx, p.sandbox_id);
  let applied: { state: SandboxState; changes: Change[] };
  try {
    applied = await applyEdits(tx, now, p.sandbox_change);
  } catch (e) {
    if (!(e instanceof SandboxError)) throw e;
    // it no longer holds on the sandbox as it is: archived, to be proposed again
    await tx.query(`UPDATE play.proposals SET status = 'archived', decided_at = now() WHERE id = $1`, [p.id]);
    return { id: p.id, status: "archived", why: e.message };
  }
  const { state, changes } = applied;
  for (const c of changes) {
    if (c.kind !== "pin") continue;
    if (!c.after) await tx.query(`DELETE FROM play.sandbox_pins WHERE sandbox_id = $1 AND slot = $2`, [p.sandbox_id, c.slot]);
    else
      await tx.query(
        `INSERT INTO play.sandbox_pins (sandbox_id, slot, version_id, variant, params) VALUES ($1, $2, $3, $4, ($5::text)::jsonb)
         ON CONFLICT (sandbox_id, slot) DO UPDATE SET version_id = EXCLUDED.version_id, variant = EXCLUDED.variant, params = EXCLUDED.params`,
        [p.sandbox_id, c.slot, c.after.version, c.after.variant, c.after.params ? JSON.stringify(c.after.params) : null],
      );
  }
  for (const name of new Set(changes.flatMap((c) => (c.kind === "config" ? [c.config] : [])))) {
    if (state.configs[name] === undefined) await tx.query(`DELETE FROM play.sandbox_configs WHERE sandbox_id = $1 AND name = $2`, [p.sandbox_id, name]);
    else
      await tx.query(
        `INSERT INTO play.sandbox_configs (sandbox_id, name, data) VALUES ($1, $2, ($3::text)::jsonb)
         ON CONFLICT (sandbox_id, name) DO UPDATE SET data = EXCLUDED.data, updated = now()`,
        [p.sandbox_id, name, JSON.stringify(state.configs[name])],
      );
  }
  await tx.query(
    `UPDATE play.proposals SET status = 'accepted', decided_by = $2, decided_at = now(), sandbox_diff = ($3::text)::jsonb WHERE id = $1`,
    [p.id, me.id, JSON.stringify(changes)],
  );
  return { id: p.id, status: "accepted" };
}

/** the sandbox as an open proposal would make it, to open it so before deciding (admins; `?proposal=` on its config) */
export async function proposedState(db: Queryable, me: Me | null, sandbox: string, proposal: string): Promise<SandboxState> {
  admin(me);
  if (!UUID.test(proposal)) throw new NotFound("There is no such proposal.");
  const { rows } = await db.query<any>(`SELECT * FROM play.proposals WHERE id = $1 AND kind = 'sandbox_change' AND sandbox_id = $2`, [proposal, sandbox]);
  if (!rows[0]) throw new NotFound("There is no such proposal of this sandbox.");
  const now = await stateOf(db, sandbox);
  if (rows[0].status !== "proposal") return now;
  return (await applyEdits(db, now, rows[0].sandbox_change).catch((e) => {
    throw e instanceof SandboxError ? new NotFound(`It no longer holds: ${e.message}`) : e;
  })).state;
}
