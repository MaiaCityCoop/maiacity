// Sources (play/SPEC.md §4.13, Samuel 2026-11-06): every link from the net Maia City keeps, a library of what we read,
// quote and point to. A source is kept over MCP by avenMAIA, the one identity of every agent connected to play's MCP,
// for the admin whose token connected it (its operator), and says where it came from: the operator pasted it (origin
// 'human', shown "Added by <the operator>") or avenMAIA found it in its own research (origin 'agent', shown "Sourced by
// avenMAIA"). Each keeps three texts avenMAIA writes from the source itself, held to their form here:
//
//   title        very compact: one line, at most 70 characters;
//   description  the mini summary: one line, at most 280 characters, no Markdown (one or two sentences);
//   summary      a small report on the overall topic: Markdown, 500–1,500 words, in the sections
//                ## What it is, ## Key points (as bullets), ## The topic, and if it likes ## For Maia City.
//
// Its authors are rows of their own (play.authors), n:m with the sources in their order: named by their UUIDs, never
// looked up or merged by a name (two of one name stay two). One link, one source: a link is kept normalised (urlOf),
// and adding one already kept answers with that source. Not "sources.ts": in play a source is also an asset version's
// readable source (source_hash, ../import/sources). Admins only, the coop's own; nothing here is typed in by hand.
import { COOP, Denied, type Me } from "./access";
import { AVENMAIA } from "./ids";
import { keyOf, type BlobStore } from "./blobs";
import { hashBytes } from "./hash";
import type { Db, Queryable } from "./pg";
import { newId, UUID } from "./uuid";

export class SourceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const SOURCE_KINDS = ["page", "article", "paper", "video", "post", "book", "podcast", "code", "other"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
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

/** The rule every agent is taught, in initialize's instructions and add_source's description (./mcp.ts). */
export const SOURCES_RULE =
  "Sources: Maia City's library of links (list_sources, get_source, add_source, update_source; list_authors, get_author). " +
  "Every link your operator pastes to you, add with origin 'human' (shown \"Added by\" them); every source you find and use in your own research (a plant's numbers, a claim in a story, a technique), add with origin 'agent' (shown \"Sourced by avenMAIA\"). " +
  `Read the source itself and write three texts: a title, very compact (one line, at most ${TITLE_MOST} characters, without the site's or channel's name, which is an author); ` +
  `a description, the mini summary (1–2 sentences, one line, at most ${DESCRIPTION_MOST} characters, no Markdown); ` +
  `and a summary, a small report on the overall topic (Markdown, ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words, in the sections ## What it is, ## Key points as bullets, ## The topic, and if you like ## For Maia City). ` +
  "Find its authors with list_authors first and reuse an author by their id (a UUID); add a new one only when none is them, and where no person is named, its publisher as an organization.";

// ---- who may

function admin(me: Me | null): Me {
  if (!me) throw new Denied("Please sign in first.", 401);
  if (me.level !== "admin") throw new Denied("Only Maia City's admins open the Sources.");
  return me;
}

// ---- a link, made one

const TRACKING = (k: string) => /^utm_/i.test(k) || /^(fbclid|gclid)$/i.test(k);

/**
 * A link as Maia City keeps it, so the same page is one source: http(s) only; its scheme and host lower-cased; its
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
    throw new SourceError("A source's url is a whole link: http(s)://…");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new SourceError("A source's url is an http(s) link.");
  if (u.username || u.password) throw new SourceError("A link with a user or a password in it is not kept: send it without them.");
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
  if (out.length > URL_MOST) throw new SourceError(`A source's url is at most ${URL_MOST} characters.`);
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
  if (typeof v !== "string" || !v.trim()) throw new SourceError(`A source needs its ${what}.`);
  const t = v.trim();
  if (/[\r\n]/.test(t)) throw new SourceError(`A source's ${what} is one line.`);
  if (chars(t) > most) throw new SourceError(`A source's ${what} is at most ${most} characters (this one is ${chars(t)}).`);
  return t;
};

export const titleOf = (v: unknown) => oneLine(v, "title (very compact: what it is about, in plain words)", TITLE_MOST);

export function descriptionOf(v: unknown) {
  const d = oneLine(v, "description (the mini summary: one or two sentences)", DESCRIPTION_MOST);
  if (/\*\*|__|`|\[[^\]]*\]\([^)]*\)|^#{1,6}\s|^[-*+>]\s|(^|\s)\*[^*\s][^*]*\*(?=$|[\s.,;:!?])/.test(d))
    throw new SourceError("A source's description is plain text: no Markdown (no **, _, `, links, headings or bullets).");
  return d;
}

/** A summary held to its form: Markdown, 500–1,500 words, in its sections in their order, its key points as bullets. */
export function summaryOf(v: unknown) {
  if (typeof v !== "string" || !v.trim()) throw new SourceError("A source needs its summary: a small report on the overall topic.");
  const s = v.trim();
  if (chars(s) > SUMMARY_CHARS_MOST) throw new SourceError(`A source's summary is at most ${SUMMARY_CHARS_MOST} characters.`);
  const words = wordsOf(s);
  if (words < SUMMARY_WORDS.least || words > SUMMARY_WORDS.most)
    throw new SourceError(`A source's summary is ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words (this one is ${words}): a small report on the overall topic.`);
  const lines = s.split(/\r?\n/);
  if (lines.some((l) => /^#\s/.test(l))) throw new SourceError("A summary's sections are level-2 headings (##); use ### inside one, never #.");
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
  if (!fits) throw new SourceError(`A summary's sections are ${form}${heads.length ? ` (this one has ${heads.map((h) => `## ${h.name}`).join(", ")})` : ""}.`);
  if (lines.slice(0, heads[0].at).some((l) => l.trim())) throw new SourceError(`A summary starts with ## ${SECTIONS[0]}.`);
  heads.forEach((h, i) => {
    const body = lines.slice(h.at + 1, heads[i + 1]?.at ?? lines.length);
    if (!wordsOf(body.join("\n"))) throw new SourceError(`A summary's ## ${h.name} has something in it.`);
    if (i === 1 && !body.some((l) => /^\s*([-*+]|\d+[.)])\s+\S/.test(l))) throw new SourceError(`A summary's ## ${SECTIONS[1]} are bullets (- …), each a claim, finding or number as the source puts it.`);
  });
  return s;
}

const kindOf = (v: unknown): SourceKind => {
  if (!SOURCE_KINDS.includes(v as SourceKind)) throw new SourceError(`A source's kind is one of ${SOURCE_KINDS.join(", ")}.`);
  return v as SourceKind;
};

const originOf = (v: unknown): Origin => {
  if (!ORIGINS.includes(v as Origin))
    throw new SourceError("A source's origin is 'human' (your operator pasted it) or 'agent' (you found it in your own research).");
  return v as Origin;
};

function tagsOf(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new SourceError("A source's tags are a list of words.");
  const out: string[] = [];
  for (const t of v) {
    const n = `${t ?? ""}`.trim().toLowerCase().replace(/\s+/g, " ");
    if (!n) continue;
    if (chars(n) > 40) throw new SourceError("A tag is at most 40 characters.");
    if (!out.includes(n)) out.push(n);
  }
  if (out.length > TAGS_MOST) throw new SourceError(`A source has at most ${TAGS_MOST} tags.`);
  return out;
}

function publishedOf(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = `${v}`.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(`${s}T00:00:00Z`) : null;
  if (!m || !d || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new SourceError("A source's published date is YYYY-MM-DD.");
  return s;
}

type AuthorGiven = { id: string } | { name: string; kind: string; url: string | null; note: string | null };

function authorsGiven(v: unknown): AuthorGiven[] {
  if (!Array.isArray(v) || !v.length)
    throw new SourceError("A source has at least one author: each an author's id (list_authors), or a new one { name, kind: person | organization }; where no person is named, its publisher as an organization.");
  if (v.length > AUTHORS_MOST) throw new SourceError(`A source has at most ${AUTHORS_MOST} authors.`);
  const ids = new Set<string>();
  return v.map((a: any, i): AuthorGiven => {
    if (a && typeof a === "object" && a.id !== undefined) {
      const id = `${a.id}`;
      if (!UUID.test(id)) throw new SourceError(`Author ${i + 1} is named by an author's id, a UUID (list_authors gives it).`);
      if (ids.has(id)) throw new SourceError(`Author ${i + 1} is named twice.`);
      ids.add(id);
      return { id };
    }
    const name = `${a?.name ?? ""}`.trim().replace(/\s+/g, " ");
    if (!name) throw new SourceError(`Author ${i + 1} is an author's id or a new one with a name.`);
    if (chars(name) > 200) throw new SourceError(`Author ${i + 1}'s name is at most 200 characters.`);
    if (!AUTHOR_KINDS.includes(a?.kind)) throw new SourceError(`Author ${i + 1}'s kind is person or organization.`);
    let url: string | null = null;
    if (a?.url !== undefined && a?.url !== null && a?.url !== "") {
      try {
        url = urlOf(a.url);
      } catch {
        throw new SourceError(`Author ${i + 1}'s url is an http(s) link.`);
      }
    }
    const note = a?.note ? `${a.note}`.trim() : null;
    if (note && chars(note) > 600) throw new SourceError(`Author ${i + 1}'s note is at most 600 characters.`);
    return { name, kind: a.kind, url, note: note || null };
  });
}

// ---- the page's text, kept as it was fetched

const TEXT_TYPE = "text/plain";

async function keepText(db: Queryable, store: BlobStore, text: unknown, title: string): Promise<string | null> {
  if (text === undefined || text === null || text === "") return null;
  if (typeof text !== "string") throw new SourceError("A source's text is the page's readable text, as a string.");
  if (/\u0000/.test(text)) throw new SourceError("A source's text is text: no NUL characters.");
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > TEXT_MOST) throw new SourceError(`A source's text is at most ${TEXT_MOST / 1e6} MB.`, 413);
  const hash = hashBytes(bytes);
  const key = (await store.has(hash)) ? keyOf(hash) : await store.put(hash, bytes, TEXT_TYPE);
  await db.query(
    `INSERT INTO play.files (hash, size, media_type, bucket_key, label) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (hash) DO NOTHING`,
    [hash, bytes.length, TEXT_TYPE, key, `Text of ${title}`.slice(0, 120)],
  );
  return hash;
}

// ---- reading

const SOURCE_COLUMNS = `s.id, s.url, s.title, s.description, s.kind, s.tags, to_char(s.published, 'YYYY-MM-DD') AS published, s.origin,
  s.created, s.updated_at, s.text_hash, s.agent_id, ag.name AS agent, s.operator_id, op.name AS operator, up.name AS updated_by,
  COALESCE((SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'kind', a.kind, 'url', a.url) ORDER BY sa.position)
              FROM play.source_authors sa JOIN play.authors a ON a.id = sa.author_id WHERE sa.source_id = s.id), '[]'::json) AS authors`;
const SOURCE_FROM = `play.sources s JOIN play.agents ag ON ag.id = s.agent_id
  LEFT JOIN play.humans op ON op.id = s.operator_id LEFT JOIN play.humans up ON up.id = s.updated_by`;

/** who brought a source, as it is shown */
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
  ...(whole ? { text_hash: r.text_hash ?? null, updated_by: r.updated_by ?? null, updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null } : {}),
});

const idOf = (v: unknown, what: string) => {
  const id = `${v ?? ""}`;
  if (!UUID.test(id)) throw new SourceError(`A ${what} is named by its id, a UUID (list_${what}s gives it).`, 404);
  return id;
};

async function sourceRow(db: Queryable, id: string) {
  const { rows } = await db.query(`SELECT ${SOURCE_COLUMNS}, s.summary FROM ${SOURCE_FROM} WHERE s.coop_id = $1 AND s.id = $2`, [COOP, id]);
  if (!rows[0]) throw new SourceError("No source is kept by that id.", 404);
  return shape(rows[0], true);
}

/** One source, whole: its three texts, kind, tags, date, link, who brought it, its authors in order, and its text's hash. */
export async function sourceOf(db: Queryable, me: Me | null, id: unknown) {
  admin(me);
  return sourceRow(db, idOf(id, "source"));
}

export type SourceQuery = { q?: string | null; author?: string | null; tag?: string | null; kind?: string | null; origin?: string | null; offset?: number; limit?: number };

/**
 * The sources, newest first, a page at a time, with how many match: `q` in a title, description, summary, link or an
 * author's name; an author (their id), a tag, a kind and an origin narrow them. Each without its summary (get_source).
 */
export async function listSources(db: Queryable, me: Me | null, o: SourceQuery = {}) {
  admin(me);
  const where = ["s.coop_id = $1"];
  const args: unknown[] = [COOP];
  const arg = (v: unknown) => (args.push(v), `$${args.length}`);
  const q = `${o.q ?? ""}`.trim().toLowerCase();
  if (q) {
    const p = arg(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(lower(s.title) LIKE ${p} OR lower(s.description) LIKE ${p} OR lower(s.summary) LIKE ${p} OR lower(s.url) LIKE ${p}
      OR EXISTS (SELECT 1 FROM play.source_authors sa JOIN play.authors a ON a.id = sa.author_id WHERE sa.source_id = s.id AND lower(a.name) LIKE ${p}))`);
  }
  if (o.author) where.push(`EXISTS (SELECT 1 FROM play.source_authors sa WHERE sa.source_id = s.id AND sa.author_id = ${arg(idOf(o.author, "author"))})`);
  if (o.tag) where.push(`${arg(`${o.tag}`.trim().toLowerCase())} = ANY(s.tags)`);
  if (o.kind) where.push(`s.kind = ${arg(kindOf(o.kind))}`);
  if (o.origin) where.push(`s.origin = ${arg(originOf(o.origin))}`);
  const limit = Math.max(1, Math.min(200, Math.floor(Number(o.limit ?? 50)) || 50));
  const offset = Math.max(0, Math.floor(Number(o.offset ?? 0)) || 0);
  const w = where.join(" AND ");
  const total = (await db.query<{ n: string }>(`SELECT count(*) AS n FROM play.sources s WHERE ${w}`, args)).rows[0];
  const { rows } = await db.query(`SELECT ${SOURCE_COLUMNS} FROM ${SOURCE_FROM} WHERE ${w} ORDER BY s.created DESC, s.id LIMIT ${arg(limit)} OFFSET ${arg(offset)}`, args);
  // every source in the coop, by origin and by kind, and its tags, most used first: the page's filters
  const tags = await db.query<{ tag: string; n: string }>(`SELECT t AS tag, count(*) AS n FROM play.sources, unnest(tags) t WHERE coop_id = $1 GROUP BY t ORDER BY count(*) DESC, t LIMIT 100`, [COOP]);
  const by = await db.query<{ origin: Origin; kind: SourceKind; n: string }>(`SELECT origin, kind, count(*) AS n FROM play.sources WHERE coop_id = $1 GROUP BY origin, kind`, [COOP]);
  const counts = { all: 0, origin: Object.fromEntries(ORIGINS.map((o) => [o, 0])) as Record<Origin, number>, kind: Object.fromEntries(SOURCE_KINDS.map((k) => [k, 0])) as Record<SourceKind, number> };
  for (const r of by.rows) {
    const k = Number(r.n);
    counts.all += k;
    counts.origin[r.origin] += k;
    counts.kind[r.kind] += k;
  }
  return { total: Number(total?.n ?? 0), offset, limit, sources: rows.map((r) => shape(r)), tags: tags.rows.map((t) => ({ tag: t.tag, count: Number(t.n) })), counts };
}

/** The authors, by name, those whose name holds `q`: each with how many sources name them. */
export async function listAuthors(db: Queryable, me: Me | null, o: { q?: string | null } = {}) {
  admin(me);
  const q = `${o.q ?? ""}`.trim().toLowerCase();
  const { rows } = await db.query(
    `SELECT a.id, a.name, a.kind, a.url, a.note, a.created, (SELECT count(*) FROM play.source_authors sa WHERE sa.author_id = a.id) AS sources
       FROM play.authors a WHERE a.coop_id = $1 AND ($2 = '' OR lower(a.name) LIKE '%' || $2 || '%')
      ORDER BY lower(a.name), a.created LIMIT 500`,
    [COOP, q],
  );
  return rows.map((r: any) => ({ id: r.id, name: r.name, kind: r.kind, url: r.url, note: r.note, sources: Number(r.sources), created: new Date(r.created).toISOString() }));
}

/** One author, with every source that names them, newest first. */
export async function authorOf(db: Queryable, me: Me | null, id: unknown) {
  admin(me);
  const aid = idOf(id, "author");
  const { rows } = await db.query(
    `SELECT a.id, a.name, a.kind, a.url, a.note, a.created, ag.name AS agent, op.name AS operator
       FROM play.authors a JOIN play.agents ag ON ag.id = a.agent_id LEFT JOIN play.humans op ON op.id = a.operator_id
      WHERE a.coop_id = $1 AND a.id = $2`,
    [COOP, aid],
  );
  const a: any = rows[0];
  if (!a) throw new SourceError("No author is kept by that id.", 404);
  const { rows: sources } = await db.query(
    `SELECT ${SOURCE_COLUMNS} FROM ${SOURCE_FROM} WHERE s.coop_id = $1 AND EXISTS (SELECT 1 FROM play.source_authors sa WHERE sa.source_id = s.id AND sa.author_id = $2)
      ORDER BY s.created DESC, s.id`,
    [COOP, aid],
  );
  return { id: a.id, name: a.name, kind: a.kind, url: a.url, note: a.note, created: new Date(a.created).toISOString(), agent: a.agent, operator: a.operator, sources: sources.map((r) => shape(r)) };
}

// ---- writing (over MCP only: avenMAIA, for the admin whose token connected it)

/** the authors given, in their order: an existing one by its id (the coop's), a new one made with a random UUID */
async function authorIds(tx: Queryable, me: Me, given: AuthorGiven[]): Promise<string[]> {
  const out: string[] = [];
  for (const [i, a] of given.entries()) {
    if ("id" in a) {
      const { rows } = await tx.query(`SELECT id FROM play.authors WHERE coop_id = $1 AND id = $2`, [COOP, a.id]);
      if (!rows[0]) throw new SourceError(`Author ${i + 1} (${a.id}) is not kept: list_authors gives the ids, or give a new one { name, kind }.`, 404);
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

async function setAuthors(tx: Queryable, source: string, ids: string[]) {
  await tx.query(`DELETE FROM play.source_authors WHERE source_id = $1`, [source]);
  for (const [position, author] of ids.entries())
    await tx.query(`INSERT INTO play.source_authors (source_id, author_id, position) VALUES ($1, $2, $3)`, [source, author, position]);
}

export type SourceGiven = {
  url?: unknown; title?: unknown; description?: unknown; summary?: unknown; authors?: unknown;
  kind?: unknown; tags?: unknown; published?: unknown; origin?: unknown; text?: unknown;
};

/**
 * Keep a source, as avenMAIA's for the admin whose token connected it. A link already kept is not kept again: the answer
 * is that source, `kept: true` (correct it with updateSource).
 */
export async function addSource(db: Db, store: BlobStore, me: Me | null, b: SourceGiven) {
  const who = admin(me);
  const url = urlOf(b?.url);
  const kept = await db.query<{ id: string }>(`SELECT id FROM play.sources WHERE coop_id = $1 AND url = $2`, [COOP, url]);
  if (kept.rows[0]) return { ...(await sourceRow(db, kept.rows[0].id)), kept: true };
  const title = titleOf(b?.title);
  const description = descriptionOf(b?.description);
  const summary = summaryOf(b?.summary);
  const kind = kindOf(b?.kind);
  const origin = originOf(b?.origin);
  const tags = tagsOf(b?.tags);
  const published = publishedOf(b?.published);
  const authors = authorsGiven(b?.authors);
  const text = await keepText(db, store, b?.text, title);
  const id = newId();
  const made = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `INSERT INTO play.sources (id, coop_id, url, title, description, summary, kind, tags, published, text_hash, agent_id, origin, operator_id, token_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (coop_id, url) DO NOTHING RETURNING id`,
      [id, COOP, url, title, description, summary, kind, tags, published, text, AVENMAIA, origin, who.id, who.token ?? null],
    );
    if (!rows[0]) return false;
    await setAuthors(tx, id, await authorIds(tx, who, authors));
    return true;
  });
  if (!made) {
    // kept a moment ago by another agent
    const { rows } = await db.query<{ id: string }>(`SELECT id FROM play.sources WHERE coop_id = $1 AND url = $2`, [COOP, url]);
    return { ...(await sourceRow(db, rows[0].id)), kept: true };
  }
  return { ...(await sourceRow(db, id)), kept: false };
}

/**
 * Correct a kept source: any of its texts, link, kind, tags, date, authors (the whole list, in order) and text, each
 * held to the same form; who changed it and when are kept. Its origin, agent and operator never change.
 */
export async function updateSource(db: Db, store: BlobStore, me: Me | null, source: unknown, b: SourceGiven) {
  const who = admin(me);
  const id = idOf(source, "source");
  const now = await sourceRow(db, id);
  if (b && "origin" in b && b.origin !== undefined && b.origin !== now.origin)
    throw new SourceError("A source's origin is kept as it came: who brought it never changes.");
  const set: string[] = [];
  const args: unknown[] = [id];
  const put = (col: string, v: unknown) => (args.push(v), set.push(`${col} = $${args.length}`));
  if (b?.url !== undefined) {
    const url = urlOf(b.url);
    if (url !== now.url) {
      const { rows } = await db.query<{ id: string }>(`SELECT id FROM play.sources WHERE coop_id = $1 AND url = $2`, [COOP, url]);
      if (rows[0]) throw new SourceError(`That link is kept already, as source ${rows[0].id}.`, 409);
      put("url", url);
    }
  }
  if (b?.title !== undefined) put("title", titleOf(b.title));
  if (b?.description !== undefined) put("description", descriptionOf(b.description));
  if (b?.summary !== undefined) put("summary", summaryOf(b.summary));
  if (b?.kind !== undefined) put("kind", kindOf(b.kind));
  if (b?.tags !== undefined) put("tags", tagsOf(b.tags));
  if (b?.published !== undefined) put("published", publishedOf(b.published));
  const authors = b?.authors !== undefined ? authorsGiven(b.authors) : null;
  if (b?.text !== undefined) put("text_hash", await keepText(db, store, b.text, `${b?.title ?? now.title}`));
  if (!set.length && !authors) throw new SourceError("Nothing to change: give the fields to correct.");
  await db.transaction(async (tx) => {
    args.push(who.id);
    set.push(`updated_by = $${args.length}`, "updated_at = now()");
    await tx.query(`UPDATE play.sources SET ${set.join(", ")} WHERE id = $1`, args);
    if (authors) await setAuthors(tx, id, await authorIds(tx, who, authors));
  });
  return sourceRow(db, id);
}
