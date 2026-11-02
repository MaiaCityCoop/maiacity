// Asset update proposals (play/SPEC.md §4.3): a citizen proposes a new version of an asset (or a new asset), built for
// the version after its head, as a recipe file names its own version; an admin accepts or rejects it. Accepting checks
// the head is still the one it was made from, in one transaction, so of two proposals on one head only the first goes
// in and the other is stale: rebuilt and proposed again on the new head.
import { randomUUID } from "node:crypto";
import type { BlobStore } from "./blobs";
import { hashText } from "./hash";
import type { Db, Queryable } from "./pg";
import { COOP, Denied, must, type Me } from "./access";
import { labelOf } from "./recipes";
import { versionId } from "./versions";

export class ProposalError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const ASSET = /^([a-z]+)\/([a-z0-9][a-z0-9-]{0,79})$/;
const VARIANT = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const MOST_FILE = 16 * 1024 * 1024;
const MEDIA = "text/javascript";

type Upload = { recipe: string; record?: any };
export type ProposalBody = {
  asset: string;
  label?: string;
  note?: string;
  base?: string | null; // the head it was made from, as the proposer saw it
  record?: any; // the version's record (card, params, contract …)
  recipe?: string; // the version's own recipe file, as text
  variants?: Record<string, Upload>;
  defaultVariant?: string;
};

/** a recipe file as uploaded: it must name this asset, this version and this variant */
function checkedFile(text: unknown, slug: string, n: number, variant: string | null) {
  if (typeof text !== "string" || !text) throw new ProposalError("A recipe file is missing.");
  if (Buffer.byteLength(text) > MOST_FILE) throw new ProposalError("A recipe file is larger than 16 MB.");
  const label = labelOf(text);
  if (!label) throw new ProposalError("That is not a recipe file of the asset box.");
  if (label.id !== slug || label.v !== n || label.variant !== variant)
    throw new ProposalError(`The recipe file builds ${label.id}@${label.v}${label.variant ? `:${label.variant}` : ""}, not ${slug}@${n}${variant ? `:${variant}` : ""}.`);
  return { text, hash: hashText(text) };
}

/** a record with its card naming what it is: the asset, the version, the variant and the file */
const recordOf = (record: any, grp: string, slug: string, n: number, variant: string | null, hash: string) => ({
  ...(record ?? {}),
  kind: "recipe",
  card: { ...(record?.card ?? {}), group: grp, id: slug, version: n, v: n, ...(variant ? { variant } : {}), recipe: hash },
});

export async function propose(db: Db, store: BlobStore, me: Me | null, body: ProposalBody) {
  const who = must(me, "propose", "asset_version");
  const m = ASSET.exec(`${body?.asset ?? ""}`);
  if (!m) throw new ProposalError("Name the asset as group/id, e.g. plants/apple.");
  const [, grp, slug] = m;
  const { rows: a } = await db.query<{ head: string | null; number: number | null; label: string }>(
    `SELECT a.head, v.number, a.label FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1`, [body.asset],
  );
  const head = a[0]?.head ?? null;
  if (body.base !== undefined && (body.base ?? null) !== head)
    throw new ProposalError("Someone changed this asset since you started: build it again on its newest version.", 409);
  const n = (a[0]?.number ?? 0) + 1;
  const label = `${body.label ?? a[0]?.label ?? ""}`.trim().slice(0, 120);
  if (!label) throw new ProposalError("A new asset needs a label.");

  const variantNames = Object.keys(body.variants ?? {});
  if (!!body.recipe === !!variantNames.length) throw new ProposalError("Give either the version's recipe file or its variants, not both.");
  const files: { text: string; hash: string }[] = [];
  let recipe: string | null = null;
  let defaultVariant: string | null = null;
  const variants: Record<string, { recipe: string; card: any }> = {};
  if (body.recipe) {
    const f = checkedFile(body.recipe, slug, n, null);
    files.push(f);
    recipe = f.hash;
  } else {
    for (const name of variantNames) {
      if (!VARIANT.test(name)) throw new ProposalError(`${name} is not a variant's name.`);
      const f = checkedFile(body.variants![name].recipe, slug, n, name);
      files.push(f);
      variants[name] = { recipe: f.hash, card: recordOf(body.variants![name].record, grp, slug, n, name, f.hash) };
    }
    defaultVariant = body.defaultVariant ?? variantNames[0];
    if (!variants[defaultVariant]) throw new ProposalError(`${defaultVariant} is not one of its variants.`);
  }
  const card = recipe ? recordOf(body.record, grp, slug, n, null, recipe) : variants[defaultVariant!].card;
  const engine = Number(card?.engine?.version ?? card?.card?.engine) || null;
  const content = { asset: body.asset, parents: head ? [head] : [], recipe, defaultVariant, variants, card, engine };
  const id = versionId(content);

  for (const f of files) await store.put(f.hash, new TextEncoder().encode(f.text), MEDIA);
  const proposal = randomUUID();
  await db.transaction(async (tx) => {
    for (const f of files)
      await tx.query(`INSERT INTO play.files (hash, size, media_type, bucket_key) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [
        f.hash, Buffer.byteLength(f.text), MEDIA, `blobs/${f.hash.slice(0, 2)}/${f.hash}`,
      ]);
    await tx.query(`INSERT INTO play.assets (id, coop_id, grp, slug, label) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [body.asset, COOP, grp, slug, label]);
    await tx.query(
      `INSERT INTO play.asset_versions (id, asset_id, parents, recipe_hash, default_variant, card, engine, author, note)
       VALUES ($1, $2, $3, $4, $5, ($6::text)::jsonb, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [id, body.asset, content.parents, recipe, defaultVariant, JSON.stringify(card), engine, who.id, `${body.note ?? ""}`.slice(0, 2000)],
    );
    for (const [name, x] of Object.entries(variants))
      await tx.query(`INSERT INTO play.asset_variants (version_id, name, recipe_hash, card) VALUES ($1, $2, $3, ($4::text)::jsonb) ON CONFLICT DO NOTHING`, [id, name, x.recipe, JSON.stringify(x.card)]);
    await tx.query(
      `INSERT INTO play.proposals (id, coop_id, kind, asset_id, base, version, author, note) VALUES ($1, $2, 'asset_version', $3, $4, $5, $6, $7)`,
      [proposal, COOP, body.asset, head, id, who.id, `${body.note ?? ""}`.slice(0, 2000)],
    );
  });
  return { id: proposal, asset: body.asset, version: id, number: n, base: head };
}

export async function listProposals(db: Queryable, me: Me | null, status?: string) {
  must(me, "read", "assets");
  const { rows } = await db.query<any>(
    `SELECT p.id, p.asset_id, p.base, p.version, p.status, p.note, p.created, p.decided_at,
            au.name AS author, de.name AS decided_by, a.label, v.card->'card'->>'label' AS version_label,
            COALESCE(b.number, 0) + 1 AS number
       FROM play.proposals p
       JOIN play.assets a ON a.id = p.asset_id
       JOIN play.asset_versions v ON v.id = p.version
       LEFT JOIN play.asset_versions b ON b.id = p.base
       LEFT JOIN play.humans au ON au.id = p.author
       LEFT JOIN play.humans de ON de.id = p.decided_by
      WHERE ($1::text IS NULL OR p.status = $1)
      ORDER BY p.created DESC LIMIT 200`,
    [status ?? null],
  );
  return rows;
}

export type Verdict = "accept" | "reject" | "withdraw";

export async function decide(db: Db, me: Me | null, id: string, verdict: Verdict) {
  if (!me) throw new Denied("Please sign in first.", 401);
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<any>(`SELECT * FROM play.proposals WHERE id = $1 FOR UPDATE`, [id]);
    const p = rows[0];
    if (!p) throw new ProposalError("There is no such proposal.", 404);
    if (p.status !== "open") throw new ProposalError(`This proposal is ${p.status} already.`, 409);
    if (verdict === "withdraw") {
      if (p.author !== me.id) throw new Denied("Only its author withdraws a proposal.");
      await tx.query(`UPDATE play.proposals SET status = 'withdrawn', decided_at = now() WHERE id = $1`, [id]);
      return { id, status: "withdrawn" };
    }
    must(me, "decide", "asset_version");
    if (verdict === "reject") {
      await tx.query(`UPDATE play.proposals SET status = 'rejected', decided_by = $2, decided_at = now() WHERE id = $1`, [id, me.id]);
      return { id, status: "rejected" };
    }
    const { rows: a } = await tx.query<{ head: string | null; number: number | null }>(
      `SELECT a.head, v.number FROM play.assets a LEFT JOIN play.asset_versions v ON v.id = a.head WHERE a.id = $1 FOR UPDATE OF a`, [p.asset_id],
    );
    if ((a[0]?.head ?? null) !== (p.base ?? null)) {
      await tx.query(`UPDATE play.proposals SET status = 'stale', decided_at = now() WHERE id = $1`, [id]);
      return { id, status: "stale" };
    }
    const n = (a[0]?.number ?? 0) + 1;
    await tx.query(`UPDATE play.asset_versions SET number = $2, approved_by = $3 WHERE id = $1`, [p.version, n, me.id]);
    await tx.query(`UPDATE play.assets SET head = $2 WHERE id = $1`, [p.asset_id, p.version]);
    await tx.query(`UPDATE play.proposals SET status = 'accepted', decided_by = $2, decided_at = now() WHERE id = $1`, [id, me.id]);
    await tx.query(
      `UPDATE play.proposals SET status = 'stale', decided_at = now()
        WHERE asset_id = $1 AND status = 'open' AND id <> $2 AND base IS NOT DISTINCT FROM $3`,
      [p.asset_id, id, p.base],
    );
    return { id, status: "accepted", number: n, version: p.version };
  });
}
