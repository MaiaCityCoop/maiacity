// Artifacts (play/SPEC.md §4.13): every link from the net Maia City keeps, kept over MCP by avenMAIA for the admin whose
// token connected it, pasted by them (origin 'human', "Added by") or found in its research (origin 'agent', "Sourced by
// avenMAIA"), with three texts held to their form here (a title of at most 70 characters, a description of at most
// 280, a summary of 500–1,500 words in its sections) and its authors (play.authors, by their UUIDs, in order). One link,
// one artifact (urlOf). An artifact is a document like any other (artifact:<uuid>, ./versioned.ts): every change of it
// waits at Proposal as an intent's work, and its row is what its accepted version says. Admins only.
import { keepFile } from "./owners";
import { admin, COOP, type Me } from "./access";
import { AVENMAIA, SCHEMA } from "./kit/ids";
import { addIntent, intentRow, recordChecks, specifyIntent } from "./intents";
import { autoMove } from "./decide";
import { keyOf, type BlobStore } from "./blobs";
import { hashBytes } from "./kit/hash";
import type { Db, Queryable } from "./kit/pg";
import { newId, UUID } from "./kit/uuid";
import * as docs from "./docs";
import { docAt, proposeDocVersion, proposeNewDoc } from "./versioned";
import { HttpError } from "./kit/errors";

export const ARTIFACT_KINDS = ["page", "article", "paper", "video", "post", "book", "podcast", "code", "other"] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];
export const AUTHOR_KINDS = ["person", "organization"] as const;
export const ORIGINS = ["human", "agent"] as const;
export type Origin = (typeof ORIGINS)[number];

export const TITLE_MOST = 70;
export const DESCRIPTION_MOST = 280;
export const SUMMARY_WORDS = { least: 500, most: 1500 } as const;
/** a summary's sections, in this order; ## For Maia City may follow them */
export const SECTIONS = ["What it is", "Key points", "The topic"] as const;
export const OPTIONAL_SECTION = "For Maia City";
export const AUTHORS_MOST = 20;
export const TAGS_MOST = 12;
/** the page's text as it was fetched, kept among play's files: at most this many bytes */
export const TEXT_MOST = 2_000_000;
const SUMMARY_CHARS_MOST = 20_000;
const URL_MOST = 2000;

// ---- who may

const ARTIFACT_ADMINS = "Only Maia City's admins open the Artifacts.";

// ---- a link, made one

const TRACKING = (k: string) => /^utm_/i.test(k) || /^(fbclid|gclid)$/i.test(k);

/**
 * A link as Maia City keeps it, so the same page is one artifact: http(s) only; its scheme and host lower-cased; its
 * #fragment, utm_* , fbclid and gclid dropped, the rest of its query kept as written; a trailing slash dropped; and a
 * YouTube video named one way (youtu.be/<id>, /shorts/<id>, /embed/<id>, /live/<id> and m.youtube.com are all
 * https://www.youtube.com/watch?v=<id>).
 */
export function urlOf(raw: unknown): string {
  const s = `${raw ?? ""}`.trim();
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new HttpError("An artifact's url is a whole link: http(s)://…");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new HttpError("An artifact's url is an http(s) link.");
  if (u.username || u.password) throw new HttpError("A link with a user or a password in it is not kept: send it without them.");
  const host = u.host.toLowerCase();
  const video = (id: string | null | undefined) => (id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null);
  if (host === "youtu.be" || host === "www.youtu.be") {
    const v = video(u.pathname.split("/")[1]);
    if (v) return v;
  }
  if (/^(www\.|m\.)?youtube\.com$/.test(host)) {
    const v = u.pathname.replace(/\/+$/, "") === "/watch" ? video(u.searchParams.get("v")) : video(/^\/(shorts|embed|live)\/([^/]+)/.exec(u.pathname)?.[2]);
    if (v) return v;
  }
  const query = u.search
    .slice(1)
    .split("&")
    .filter((pair) => {
      if (!pair) return false;
      let k = pair.split("=")[0];
      try {
        k = decodeURIComponent(k.replace(/\+/g, " "));
      } catch {}
      return !TRACKING(k);
    })
    .join("&");
  const out = `${u.protocol}//${host}${u.pathname.replace(/\/+$/, "")}${query ? `?${query}` : ""}`;
  if (out.length > URL_MOST) throw new HttpError(`An artifact's url is at most ${URL_MOST} characters.`);
  return out;
}

// ---- the three texts

/** characters as Postgres counts them (code points) */
const chars = (s: string) => [...s].length;

/** The words of a Markdown text: its headings', bullets' and links' words, not their marks or a link's address. */
export function wordsOf(md: string): number {
  const text = md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/<[^>]*>/g, " ");
  return (text.match(/[\p{L}\p{N}]+(?:['’.,\-][\p{L}\p{N}]+)*/gu) ?? []).length;
}

const oneLine = (v: unknown, what: string, most: number) => {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(`An artifact needs its ${what}.`);
  const t = v.trim();
  if (/[\r\n]/.test(t)) throw new HttpError(`An artifact's ${what} is one line.`);
  if (chars(t) > most) throw new HttpError(`An artifact's ${what} is at most ${most} characters (this one is ${chars(t)}).`);
  return t;
};

export const titleOf = (v: unknown) => oneLine(v, "title (very compact: what it is about, in plain words)", TITLE_MOST);

export function descriptionOf(v: unknown) {
  const d = oneLine(v, "description (the mini summary: one or two sentences)", DESCRIPTION_MOST);
  if (/\*\*|__|`|\[[^\]]*\]\([^)]*\)|^#{1,6}\s|^[-*+>]\s|(^|\s)\*[^*\s][^*]*\*(?=$|[\s.,;:!?])/.test(d))
    throw new HttpError("An artifact's description is plain text: no Markdown (no **, _, `, links, headings or bullets).");
  return d;
}

/** A summary held to its form: Markdown, 500–1,500 words, in its sections in their order, its key points as bullets. */
export function summaryOf(v: unknown) {
  if (typeof v !== "string" || !v.trim()) throw new HttpError("An artifact needs its summary: a small report on the overall topic.");
  const s = v.trim();
  if (chars(s) > SUMMARY_CHARS_MOST) throw new HttpError(`An artifact's summary is at most ${SUMMARY_CHARS_MOST} characters.`);
  const words = wordsOf(s);
  if (words < SUMMARY_WORDS.least || words > SUMMARY_WORDS.most)
    throw new HttpError(`An artifact's summary is ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words (this one is ${words}): a small report on the overall topic.`);
  const lines = s.split(/\r?\n/);
  if (lines.some((l) => /^#\s/.test(l))) throw new HttpError("A summary's sections are level-2 headings (##); use ### inside one, never #.");
  const heads: { name: string; at: number }[] = [];
  lines.forEach((l, at) => {
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(l);
    if (m) heads.push({ name: m[1].trim(), at });
  });
  const want = [...SECTIONS] as string[];
  const names = heads.map((h) => h.name.toLowerCase());
  const fits =
    (names.length === 3 || (names.length === 4 && names[3] === OPTIONAL_SECTION.toLowerCase())) && want.every((w, i) => names[i] === w.toLowerCase());
  const form = `## ${SECTIONS.join(", ## ")} in that order, and if you like ## ${OPTIONAL_SECTION} last`;
  if (!fits) throw new HttpError(`A summary's sections are ${form}${heads.length ? ` (this one has ${heads.map((h) => `## ${h.name}`).join(", ")})` : ""}.`);
  if (lines.slice(0, heads[0].at).some((l) => l.trim())) throw new HttpError(`A summary starts with ## ${SECTIONS[0]}.`);
  heads.forEach((h, i) => {
    const body = lines.slice(h.at + 1, heads[i + 1]?.at ?? lines.length);
    if (!wordsOf(body.join("\n"))) throw new HttpError(`A summary's ## ${h.name} has something in it.`);
    if (i === 1 && !body.some((l) => /^\s*([-*+]|\d+[.)])\s+\S/.test(l))) throw new HttpError(`A summary's ## ${SECTIONS[1]} are bullets (- …), each a claim, finding or number as the artifact puts it.`);
  });
  return s;
}

const kindOf = (v: unknown): ArtifactKind => {
  if (!ARTIFACT_KINDS.includes(v as ArtifactKind)) throw new HttpError(`An artifact's kind is one of ${ARTIFACT_KINDS.join(", ")}.`);
  return v as ArtifactKind;
};

const originOf = (v: unknown): Origin => {
  if (!ORIGINS.includes(v as Origin))
    throw new HttpError("An artifact's origin is 'human' (your operator pasted it) or 'agent' (you found it in your own research).");
  return v as Origin;
};

function tagsOf(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new HttpError("An artifact's tags are a list of words.");
  const out: string[] = [];
  for (const t of v) {
    const n = `${t ?? ""}`.trim().toLowerCase().replace(/\s+/g, " ");
    if (!n) continue;
    if (chars(n) > 40) throw new HttpError("A tag is at most 40 characters.");
    if (!out.includes(n)) out.push(n);
  }
  if (out.length > TAGS_MOST) throw new HttpError(`An artifact has at most ${TAGS_MOST} tags.`);
  return out;
}

function publishedOf(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = `${v}`.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(`${s}T00:00:00Z`) : null;
  if (!m || !d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new HttpError("An artifact's published date is YYYY-MM-DD.");
  return s;
}

type AuthorGiven = { id: string } | { name: string; kind: string; url: string | null; note: string | null };

function authorsGiven(v: unknown): AuthorGiven[] {
  if (!Array.isArray(v) || !v.length)
    throw new HttpError("An artifact has at least one author: each an author's id (list_authors), or a new one { name, kind: person | organization }; where no person is named, its publisher as an organization.");
  if (v.length > AUTHORS_MOST) throw new HttpError(`An artifact has at most ${AUTHORS_MOST} authors.`);
  const ids = new Set<string>();
  return v.map((a: any, i): AuthorGiven => {
    if (a && typeof a === "object" && a.id !== undefined) {
      const id = `${a.id}`;
      if (!UUID.test(id)) throw new HttpError(`Author ${i + 1} is named by an author's id, a UUID (list_authors gives it).`);
      if (ids.has(id)) throw new HttpError(`Author ${i + 1} is named twice.`);
      ids.add(id);
      return { id };
    }
    const name = `${a?.name ?? ""}`.trim().replace(/\s+/g, " ");
    if (!name) throw new HttpError(`Author ${i + 1} is an author's id or a new one with a name.`);
    if (chars(name) > 200) throw new HttpError(`Author ${i + 1}'s name is at most 200 characters.`);
    if (!AUTHOR_KINDS.includes(a?.kind)) throw new HttpError(`Author ${i + 1}'s kind is person or organization.`);
    let url: string | null = null;
    if (a?.url !== undefined && a?.url !== null && a?.url !== "") {
      try {
        url = urlOf(a.url);
      } catch {
        throw new HttpError(`Author ${i + 1}'s url is an http(s) link.`);
      }
    }
    const note = a?.note ? `${a.note}`.trim() : null;
    if (note && chars(note) > 600) throw new HttpError(`Author ${i + 1}'s note is at most 600 characters.`);
    return { name, kind: a.kind, url, note: note || null };
  });
}

// ---- the page's text, kept as it was fetched

const TEXT_TYPE = "text/plain";

async function keepText(db: Queryable, store: BlobStore, text: unknown, title: string): Promise<string | null> {
  if (text === undefined || text === null || text === "") return null;
  if (typeof text !== "string") throw new HttpError("An artifact's text is the page's readable text, as a string.");
  if (/\u0000/.test(text)) throw new HttpError("An artifact's text is text: no NUL characters.");
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > TEXT_MOST) throw new HttpError(`An artifact's text is at most ${TEXT_MOST / 1e6} MB.`, 413);
  const hash = hashBytes(bytes);
  const key = (await store.has(hash)) ? keyOf(hash) : await store.put(hash, bytes, TEXT_TYPE);
  await keepFile(db, { hash, size: bytes.length, media_type: TEXT_TYPE, bucket_key: key, label: `Text of ${title}`.slice(0, 120) });
  return hash;
}

// ---- reading

const ARTIFACT_COLUMNS = `s.id, s.url, s.title, s.description, s.kind, s.tags, to_char(s.published, 'YYYY-MM-DD') AS published, s.origin,
  s.created, COALESCE(up.at, s.updated_at) AS updated_at, s.text_hash, s.agent_id, ag.name AS agent, s.operator_id, op.name AS operator, COALESCE(up.name, uo.name) AS updated_by,
  COALESCE((SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'kind', a.kind, 'url', a.url) ORDER BY sa.position)
              FROM play.artifact_authors sa JOIN play.authors a ON a.id = sa.author_id WHERE sa.artifact_id = s.id), '[]'::json) AS authors,
  (SELECT iv.intent_id FROM play.intent_variants iv JOIN play.intents i ON i.id = iv.intent_id WHERE iv.doc_id = 'artifact:' || s.id::text AND i.stage IN ('build', 'proposal') LIMIT 1) AS open_intent`;
const ARTIFACT_FROM = `play.artifacts s LEFT JOIN play.agents ag ON ag.id = s.agent_id
  LEFT JOIN play.humans op ON op.id = s.operator_id LEFT JOIN play.humans uo ON uo.id = s.updated_by
  LEFT JOIN LATERAL (SELECT h.name, v.decided_at AS at FROM play.doc_variants v JOIN play.intents i ON i.id = v.intent_id JOIN play.humans h ON h.id = i.proposed_by
    WHERE v.doc_id = 'artifact:' || s.id::text AND v.version > 1 ORDER BY v.version DESC LIMIT 1) up ON true`;

/** who brought an artifact, as it is shown */
const byOf = (origin: Origin, operator: string | null, agent: string) =>
  origin === "human" ? `Added by ${operator ?? "a former member"}` : `Sourced by ${agent}`;

const shape = (r: any, whole = false) => ({
  id: r.id,
  url: r.url,
  title: r.title,
  description: r.description,
  ...(whole ? { summary: r.summary } : {}),
  kind: r.kind,
  tags: r.tags ?? [],
  published: r.published ?? null,
  origin: r.origin as Origin,
  by: byOf(r.origin, r.operator, r.agent),
  agent: { id: r.agent_id, name: r.agent },
  operator: r.operator_id ? { id: r.operator_id, name: r.operator } : null,
  authors: r.authors ?? [],
  created: new Date(r.created).toISOString(),
  intent: r.open_intent ?? null,
  ...(whole ? { text_hash: r.text_hash ?? null, updated_by: r.updated_by ?? null, updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null } : {}),
});

const idOf = (v: unknown, what: string) => {
  const id = `${v ?? ""}`;
  if (!UUID.test(id)) throw new HttpError(`${what === "artifact" ? "An" : "A"} ${what} is named by its id, a UUID (list_${what}s gives it).`, 404);
  return id;
};

async function artifactRow(db: Queryable, id: string) {
  const { rows } = await db.query(`SELECT ${ARTIFACT_COLUMNS}, s.summary FROM ${ARTIFACT_FROM} WHERE s.coop_id = $1 AND s.id = $2 AND s.title IS NOT NULL`, [COOP, id]);
  if (!rows[0]) throw new HttpError("No artifact is kept by that id.", 404);
  return shape(rows[0], true);
}

/** One artifact, whole: its three texts, kind, tags, date, link, who brought it, its authors in order, and its text's hash. */
export async function artifactOf(db: Queryable, me: Me | null, id: unknown) {
  admin(me, ARTIFACT_ADMINS);
  return artifactRow(db, idOf(id, "artifact"));
}

export type ArtifactQuery = { q?: string | null; author?: string | null; tag?: string | null; kind?: string | null; origin?: string | null; offset?: number; limit?: number };

/**
 * The artifacts, newest first, a page at a time, with how many match: `q` in a title, description, summary, link or an
 * author's name; an author (their id), a tag, a kind and an origin narrow them. Each without its summary (get_artifact).
 */
export async function listArtifacts(db: Queryable, me: Me | null, o: ArtifactQuery = {}) {
  admin(me, ARTIFACT_ADMINS);
  const where = ["s.coop_id = $1", "s.title IS NOT NULL"];
  const args: unknown[] = [COOP];
  const arg = (v: unknown) => (args.push(v), `$${args.length}`);
  const q = `${o.q ?? ""}`.trim().toLowerCase();
  if (q) {
    const p = arg(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(lower(s.title) LIKE ${p} OR lower(s.description) LIKE ${p} OR lower(s.summary) LIKE ${p} OR lower(s.url) LIKE ${p}
      OR EXISTS (SELECT 1 FROM play.artifact_authors sa JOIN play.authors a ON a.id = sa.author_id WHERE sa.artifact_id = s.id AND lower(a.name) LIKE ${p}))`);
  }
  if (o.author) where.push(`EXISTS (SELECT 1 FROM play.artifact_authors sa WHERE sa.artifact_id = s.id AND sa.author_id = ${arg(idOf(o.author, "author"))})`);
  if (o.tag) where.push(`${arg(`${o.tag}`.trim().toLowerCase())} = ANY(s.tags)`);
  if (o.kind) where.push(`s.kind = ${arg(kindOf(o.kind))}`);
  if (o.origin) where.push(`s.origin = ${arg(originOf(o.origin))}`);
  const limit = Math.max(1, Math.min(200, Math.floor(Number(o.limit ?? 50)) || 50));
  const offset = Math.max(0, Math.floor(Number(o.offset ?? 0)) || 0);
  const w = where.join(" AND ");
  const total = (await db.query<{ n: string }>(`SELECT count(*) AS n FROM play.artifacts s WHERE ${w}`, args)).rows[0];
  const { rows } = await db.query(`SELECT ${ARTIFACT_COLUMNS} FROM ${ARTIFACT_FROM} WHERE ${w} ORDER BY s.created DESC, s.id LIMIT ${arg(limit)} OFFSET ${arg(offset)}`, args);
  // every artifact in the coop, by origin and by kind, and its tags, most used first: the page's filters
  const tags = await db.query<{ tag: string; n: string }>(`SELECT t AS tag, count(*) AS n FROM play.artifacts, unnest(tags) t WHERE coop_id = $1 AND title IS NOT NULL GROUP BY t ORDER BY count(*) DESC, t LIMIT 100`, [COOP]);
  const by = await db.query<{ origin: Origin; kind: ArtifactKind; n: string }>(`SELECT origin, kind, count(*) AS n FROM play.artifacts WHERE coop_id = $1 AND title IS NOT NULL GROUP BY origin, kind`, [COOP]);
  const counts = { all: 0, origin: Object.fromEntries(ORIGINS.map((o) => [o, 0])) as Record<Origin, number>, kind: Object.fromEntries(ARTIFACT_KINDS.map((k) => [k, 0])) as Record<ArtifactKind, number> };
  for (const r of by.rows) {
    const k = Number(r.n);
    counts.all += k;
    counts.origin[r.origin] += k;
    counts.kind[r.kind] += k;
  }
  return { total: Number(total?.n ?? 0), offset, limit, artifacts: rows.map((r) => shape(r)), tags: tags.rows.map((t) => ({ tag: t.tag, count: Number(t.n) })), counts };
}

/** The authors, by name, those whose name holds `q`: each with how many artifacts name them. */
export async function listAuthors(db: Queryable, me: Me | null, o: { q?: string | null } = {}) {
  admin(me, ARTIFACT_ADMINS);
  const q = `${o.q ?? ""}`.trim().toLowerCase();
  const { rows } = await db.query(
    `SELECT a.id, a.name, a.kind, a.url, a.note, a.created, (SELECT count(*) FROM play.artifact_authors sa WHERE sa.author_id = a.id) AS artifacts
       FROM play.authors a WHERE a.coop_id = $1 AND ($2 = '' OR lower(a.name) LIKE '%' || $2 || '%')
      ORDER BY lower(a.name), a.created LIMIT 500`,
    [COOP, q],
  );
  return rows.map((r: any) => ({ id: r.id, name: r.name, kind: r.kind, url: r.url, note: r.note, artifacts: Number(r.artifacts), created: new Date(r.created).toISOString() }));
}

/** One author, with every artifact that names them, newest first. */
export async function authorOf(db: Queryable, me: Me | null, id: unknown) {
  admin(me, ARTIFACT_ADMINS);
  const aid = idOf(id, "author");
  const { rows } = await db.query(
    `SELECT a.id, a.name, a.kind, a.url, a.note, a.created, ag.name AS agent, op.name AS operator
       FROM play.authors a JOIN play.agents ag ON ag.id = a.agent_id LEFT JOIN play.humans op ON op.id = a.operator_id
      WHERE a.coop_id = $1 AND a.id = $2`,
    [COOP, aid],
  );
  const a: any = rows[0];
  if (!a) throw new HttpError("No author is kept by that id.", 404);
  const { rows: artifacts } = await db.query(
    `SELECT ${ARTIFACT_COLUMNS} FROM ${ARTIFACT_FROM} WHERE s.coop_id = $1 AND s.title IS NOT NULL AND EXISTS (SELECT 1 FROM play.artifact_authors sa WHERE sa.artifact_id = s.id AND sa.author_id = $2)
      ORDER BY s.created DESC, s.id`,
    [COOP, aid],
  );
  return { id: a.id, name: a.name, kind: a.kind, url: a.url, note: a.note, created: new Date(a.created).toISOString(), agent: a.agent, operator: a.operator, artifacts: artifacts.map((r) => shape(r)) };
}

// ---- changing: its next version proposed, for the intent named (held to its gate): no work without an intent

/** the authors given, in their order: an existing one by its id (the coop's), a new one made with a random UUID */
async function authorIds(tx: Queryable, me: Me, given: AuthorGiven[]): Promise<string[]> {
  const out: string[] = [];
  for (const [i, a] of given.entries()) {
    if ("id" in a) {
      const { rows } = await tx.query(`SELECT id FROM play.authors WHERE coop_id = $1 AND id = $2`, [COOP, a.id]);
      if (!rows[0]) throw new HttpError(`Author ${i + 1} (${a.id}) is not kept: list_authors gives the ids, or give a new one { name, kind }.`, 404);
      out.push(a.id);
    } else {
      const id = newId();
      await tx.query(`INSERT INTO play.authors (id, coop_id, name, kind, url, note, agent_id, operator_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        id, COOP, a.name, a.kind, a.url, a.note, AVENMAIA, me.id,
      ]);
      out.push(id);
    }
  }
  return out;
}

/** the artifact a link is kept as (accepted), or the intent whose work keeps it already (waiting) */
async function linkHeld(db: Queryable, url: string): Promise<{ kept?: string; waiting?: string }> {
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM play.artifacts WHERE coop_id = $1 AND url = $2`, [COOP, url]);
  if (rows[0]) return { kept: rows[0].id };
  const { rows: open } = await db.query<{ intent_id: string; doc_id: string; variant_id: string }>(
    `SELECT iv.intent_id, iv.doc_id, iv.variant_id FROM play.intent_variants iv JOIN play.intents i ON i.id = iv.intent_id
      WHERE iv.doc_id LIKE 'artifact:%' AND i.stage IN ('build', 'proposal')`,
  );
  for (const o of open) if ((await docs.readDoc(db, o.doc_id, { variant: Number(o.variant_id) })).json.url === url) return { waiting: o.intent_id };
  return {};
}

export type ArtifactGiven = {
  url?: unknown; title?: unknown; description?: unknown; summary?: unknown; authors?: unknown;
  kind?: unknown; tags?: unknown; published?: unknown; origin?: unknown; text?: unknown;
};

// ---- no tap for an artifact (play/SPEC.md §4.12 "Auto-accept rules", intent de24f1c5): added or corrected with no
// intent named, it makes its own through the intent flow's own functions, in one transaction, and the rules decide it

/** the caller's transaction as a Db: every transaction asked of it is that one (the whole request is one) */
const flat = (tx: Queryable): Db => ({ query: (t, p) => tx.query(t, p), exec: async (t) => void (await tx.query(t)), transaction: (fn) => fn(tx) });

/** the intent an artifact's change made for itself: what it is, and its spec, play's own */
type Own = { kind: "idea" | "improve"; title: string; goal: string; evidence: string };
/** its one check: a look play records as passed, with the form checks just made as its evidence */
const OWN_CHECK = { check: "The artifact holds to the artifacts' form (three texts, authors, one link)", how: "look", by: "the form checks add_artifact and update_artifact make: its link, title, description, summary and authors", must: true };

/**
 * An intent of the artifact's own (author the admin, via mcp, declaring the artifact schema), specified with play's
 * spec and asked of the rules (Approve spec); in Build, its check recorded (it is at Proposal) and its work proposed
 * (`propose`, naming it), then asked of the rules again (Accept). Where no rule decides, it waits for a person, at
 * Specify (nothing proposed yet) or at Proposal. Gives back the intent's id and stage and what `propose` gave.
 */
async function ownIntent<R>(db: Db, store: BlobStore, who: Me, o: Own, propose: (intent: string) => Promise<R>): Promise<{ intent: string; stage: string; auto: unknown; proposed: R | null }> {
  const i = await addIntent(db, who, { kind: o.kind, title: o.title, note: "Made by play for the artifact's change, with no intent named (play/SPEC.md §4.12, Auto-accept rules).", work_kind: [SCHEMA.artifact] });
  await specifyIntent(db, who, i.id, { goal: o.goal, scope: "One artifact (a link Maia City keeps) and its texts and authors; nothing else changes.", nothing_to_reduce: "a link kept or corrected removes nothing", checks: [OWN_CHECK] });
  await autoMove({ db, store }, i.id, { me: who });
  if ((await intentRow(db, i.id)).stage !== "build") return { intent: i.id, ...(await stageOf(db, i.id)), proposed: null };
  await recordChecks(db, who, i.id, [{ check: "c1", pass: true, evidence: o.evidence }]);
  const proposed = await propose(i.id);
  await autoMove({ db, store }, i.id, { me: who });
  return { intent: i.id, ...(await stageOf(db, i.id)), proposed };
}
const stageOf = async (db: Db, id: string) => {
  const r = await intentRow(db, id);
  return { stage: r.stage as string, auto: r.auto };
};
/** the form checks just made, as the evidence of its look */
const formEvidence = (j: any) =>
  `play's form checks passed: one link (${j.url}), a title of ${j.title.length} characters, a description of ${j.description.length}, a summary of ${j.summary.trim().split(/\s+/).length} words in its sections, ${j.authors.length} author${j.authors.length === 1 ? "" : "s"} by id.`;

/**
 * Keep an artifact (its first version proposed); a link kept already answers with it (`kept`), one waiting with its
 * intent. With no intent named it makes its own (ownIntent), in one transaction: kept at once where the rules accept it.
 */
export async function addArtifact(db: Db, store: BlobStore, me: Me | null, b: ArtifactGiven, intent?: string) {
  if (intent) return addIn(db, store, me, b, intent);
  admin(me, ARTIFACT_ADMINS);
  return db.transaction((tx) => addIn(flat(tx), store, me, b));
}

async function addIn(db: Db, store: BlobStore, me: Me | null, b: ArtifactGiven, intent?: string) {
  const who = admin(me, ARTIFACT_ADMINS);
  const url = urlOf(b?.url);
  const held = await linkHeld(db, url);
  if (held.kept) return { ...(await artifactRow(db, held.kept)), kept: true };
  if (held.waiting) return { url, kept: false, waiting: true, intent: held.waiting, stage: "proposal" };
  const title = titleOf(b?.title);
  const json = {
    schema: "artifact/1", url, title, description: descriptionOf(b?.description), summary: summaryOf(b?.summary), kind: kindOf(b?.kind), tags: tagsOf(b?.tags),
    published: publishedOf(b?.published), text_hash: await keepText(db, store, b?.text, title), origin: originOf(b?.origin), agent: AVENMAIA,
    operator: who.id, token: who.token ?? null, authors: [] as string[],
  };
  const given = authorsGiven(b?.authors);
  json.authors = await db.transaction((tx) => authorIds(tx, who, given));
  const note = `Keep the artifact ${title} (${url})`;
  if (!intent) {
    const own = await ownIntent(db, store, who, { kind: "idea", title: `Keep ${title}`, goal: `Maia City keeps the artifact ${title} (${url}).`, evidence: formEvidence(json) }, (i) =>
      proposeNewDoc({ db, store }, who, "artifact", { whole: json, note, intent: i }),
    );
    if (!own.proposed) return { url, title, kept: false, waiting: true, intent: own.intent, stage: own.stage };
    if (own.stage === "accepted") return { ...(await artifactRow(db, own.proposed.doc)), kept: false, waiting: false, intent: own.intent, stage: own.stage, auto: own.auto };
    return { id: own.proposed.doc, url, title, kept: false, waiting: true, intent: own.intent, stage: own.stage };
  }
  const r = await proposeNewDoc({ db, store }, who, "artifact", { whole: json, note, intent });
  return { id: r.doc, url, title, kept: false, waiting: true, intent: r.intent, stage: r.stage };
}

/** Correct a kept artifact (its next version proposed): any field but who brought it, each held to its form. With no intent named it makes its own, as addArtifact. */
export async function updateArtifact(db: Db, store: BlobStore, me: Me | null, artifact: unknown, b: ArtifactGiven, intent?: string) {
  if (intent) return updateIn(db, store, me, artifact, b, intent);
  admin(me, ARTIFACT_ADMINS);
  return db.transaction((tx) => updateIn(flat(tx), store, me, artifact, b));
}

async function updateIn(db: Db, store: BlobStore, me: Me | null, artifact: unknown, b: ArtifactGiven, intent?: string) {
  const who = admin(me, ARTIFACT_ADMINS);
  const id = idOf(artifact, "artifact");
  const now = await artifactRow(db, id);
  if (b && "origin" in b && b.origin !== undefined && b.origin !== now.origin)
    throw new HttpError("An artifact's origin is kept as it came: who brought it never changes.");
  const cur = (await docAt({ db, store }, who, id)).json;
  const next: any = { ...cur };
  if (b?.url !== undefined) {
    next.url = urlOf(b.url);
    const held = next.url === now.url ? {} : await linkHeld(db, next.url);
    if (held.kept || held.waiting) throw new HttpError(`That link is kept already, as ${held.kept ? `artifact ${held.kept}` : `intent ${held.waiting}'s work`}.`, 409);
  }
  if (b?.title !== undefined) next.title = titleOf(b.title);
  if (b?.description !== undefined) next.description = descriptionOf(b.description);
  if (b?.summary !== undefined) next.summary = summaryOf(b.summary);
  if (b?.kind !== undefined) next.kind = kindOf(b.kind);
  if (b?.tags !== undefined) next.tags = tagsOf(b.tags);
  if (b?.published !== undefined) next.published = publishedOf(b.published);
  if (b?.text !== undefined) next.text_hash = await keepText(db, store, b.text, `${b?.title ?? now.title}`);
  if (b?.authors !== undefined) {
    const given = authorsGiven(b.authors);
    next.authors = await db.transaction((tx) => authorIds(tx, who, given));
  }
  if (!Object.keys(b ?? {}).some((k) => k !== "origin" && (b as any)[k] !== undefined)) throw new HttpError("Nothing to change: give the fields to correct.");
  const fields = Object.keys(b).filter((k) => k !== "origin").join(", ");
  const note = `Correct the artifact ${next.title}: ${fields}`;
  if (!intent) {
    const own = await ownIntent(db, store, who, { kind: "improve", title: `Correct ${now.title}`, goal: `Maia City keeps the artifact ${next.title} (${next.url}) corrected: ${fields}.`, evidence: formEvidence(next) }, (i) =>
      proposeDocVersion({ db, store }, who, { doc: id, whole: next, note, intent: i }),
    );
    const r: any = own.proposed;
    if (own.stage === "accepted") return { ...(await artifactRow(db, id)), waiting: false, intent: own.intent, stage: own.stage, auto: own.auto, ...(r ? { number: r.number, changes: r.changes } : {}) };
    return { ...now, waiting: true, intent: own.intent, stage: own.stage, ...(r ? { number: r.number, changes: r.changes } : {}) };
  }
  const r = await proposeDocVersion({ db, store }, who, { doc: id, whole: next, note, intent });
  return { ...now, waiting: true, intent: r.intent, stage: r.stage, number: (r as any).number, changes: (r as any).changes };
}

/** an artifact's row is what its accepted version says; one kept before artifacts were documents gets its document
 *  made from its row, as its v1, the first time it is read (./allkinds.ts's ensure) */
const ARTIFACT_ROW = `url, title, description, summary, kind, tags, to_char(published, 'YYYY-MM-DD') AS published, text_hash, origin, agent_id AS agent, operator_id AS operator, token_id AS token, author_ids AS authors`;
export async function ensureArtifactDoc(q: Queryable, id: string) {
  const { rows } = await q.query<any>(`SELECT ${ARTIFACT_ROW}, created FROM play.artifacts WHERE id = $1`, [id]);
  const { created, ...r } = rows[0] ?? {};
  if (!r.title) return;
  const note = "kept before artifacts were documents";
  await docs.createDoc(q, { id: `artifact:${id}`, schema: SCHEMA.artifact, json: { schema: "artifact/1", ...r, tags: r.tags ?? [], authors: r.authors ?? [] }, author: { human: r.operator, via: "import" }, message: `v1: ${note}`, at: created, version: note });
}
