// The legacy avenDB server's public feed, read only (play/SPEC.md §6). It takes post-quantum TLS alone, so this runs
// on Bun (OpenSSL 3.5); curl on OpenSSL 3.0 fails its handshake. Every file is cached on disk by its feed root, so an
// import run again reads nothing it has read before.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const FEED = process.env.AVENDB_PUBLIC_FEED || "https://avendb.maia.city/feed";

export type FeedFile = { root: string; len: number; size: number };
export type FeedRow = {
  vault: string;
  entry: string;
  type: string;
  tags: string[];
  heads: string[];
  at?: string[];
  files?: FeedFile[];
  record: any;
  version?: { version: number; edits: number; writes: number };
  authors?: { kind: string; name: string; vault: string }[];
  created?: number;
};

async function retried<T>(what: string, fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw new Error(`${what}: ${(e as Error).message}`);
      await Bun.sleep(500 * 2 ** i);
    }
  }
}

/** every public entry of the seed vault (Maia City) of `type` */
export async function rowsOf(type: string): Promise<FeedRow[]> {
  return retried(`feed ${type}`, async () => {
    const r = await fetch(`${FEED}/entries?seed=1&type=${encodeURIComponent(type)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return ((await r.json()) as { entries: FeedRow[] }).entries;
  });
}

/** one file of an entry, by its root: from the cache, else from the feed (then cached) */
export async function fileOf(row: FeedRow, f: FeedFile, cache: string): Promise<Uint8Array> {
  const path = join(cache, f.root);
  const kept = Bun.file(path);
  if (await kept.exists()) return new Uint8Array(await kept.arrayBuffer());
  const bytes = await retried(`file ${f.root}`, async () => {
    const r = await fetch(`${FEED}/entry/${row.vault}/${row.entry}/file/${f.root}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.length !== f.len) throw new Error(`${b.length} bytes, the row says ${f.len}`);
    return b;
  });
  await mkdir(cache, { recursive: true });
  await Bun.write(path, bytes);
  return bytes;
}

/** a row of an entry's full view: one version or variant, on the main line (`line` null) or on a variant's own line */
export type BroughtRow = { line: string | null; edit: string; at: string[]; files: FeedFile[]; record: any; authors?: FeedRow["authors"] };
export type EntryView = FeedRow & { brought: BroughtRow[] };

/** one entry with every version and variant it holds (`brought`), cached as JSON by entry and heads */
export async function viewOf(row: FeedRow, cache: string): Promise<EntryView> {
  const path = join(cache, `view-${row.entry}-${(row.heads ?? []).join("-").slice(0, 64)}.json`);
  const kept = Bun.file(path);
  if (await kept.exists()) return kept.json();
  const view = await retried(`entry ${row.entry}`, async () => {
    const r = await fetch(`${FEED}/entry/${row.vault}/${row.entry}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as EntryView;
  });
  await mkdir(cache, { recursive: true });
  await Bun.write(path, JSON.stringify(view));
  return view;
}
