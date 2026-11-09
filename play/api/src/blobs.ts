// Where blobs live: the bucket (Hetzner Object Storage, S3's protocol) in production, a folder on disk in development
// and tests. Each blob is kept under its BLAKE3 hash and handed out only after its bytes are checked against it.
//
// The bucket is held to be resilient (Samuel 2026-11-05: "never run into this flaky store issue"):
//   steady        every call to it given a time to answer and asked again, with a wait that doubles, when it is slow, cut
//                 off or answers 5xx / slow down (never when the key is missing, access is refused or bytes don't hash)
//   mirroredStore every file kept in a second place too (the backups' store, BACKUPS/play-files/blobs/, written through
//                 on every put): a file the first can't hand back whole is read from the second, checked against its
//                 hash, and put back into the first
//   cachedStore   files never change, so one handed out is kept in memory (bounded) and not asked of the bucket again
//   size          a file's size without its bytes: what a deploy checks of every file (its bytes were checked against
//                 its hash when it was written), so a deploy no longer reads every file back
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { HASH, hashBytes } from "./kit/hash";

export interface BlobStore {
  has(hash: string): Promise<boolean>;
  /** its size in bytes, without reading it (null: not there) */
  size(hash: string): Promise<number | null>;
  put(hash: string, bytes: Uint8Array, mediaType: string): Promise<string>; // returns its bucket key
  get(hash: string): Promise<Uint8Array | null>;
  /** a URL the browser may read it from for `seconds` */
  url(hash: string, seconds?: number): string;
  /** its media type where the store keeps one */
  typeOf?(hash: string): Promise<string | null>;
}

export const keyOf = (hash: string) => {
  if (!HASH.test(hash)) throw new Error(`not a hash: ${hash}`);
  return `blobs/${hash.slice(0, 2)}/${hash}`;
};

function checked(hash: string, bytes: Uint8Array) {
  const got = hashBytes(bytes);
  if (got !== hash) throw new Error(`blob ${hash} holds bytes hashing to ${got}`);
}

export function folderStore(dir: string, publicBase = "/api/files"): BlobStore {
  const path = (h: string) => join(dir, keyOf(h));
  /** whether the file there holds the blob whole: a write cut short (a full disk) leaves it empty or partial */
  const whole = async (h: string) => {
    const f = Bun.file(path(h));
    if (!(await f.exists())) return false;
    return hashBytes(new Uint8Array(await f.arrayBuffer())) === h;
  };
  return {
    has: whole,
    async size(h) {
      try {
        return (await stat(path(h))).size;
      } catch {
        return null;
      }
    },
    async put(h, bytes) {
      checked(h, bytes);
      if (await whole(h)) return keyOf(h);
      await mkdir(join(dir, "blobs", h.slice(0, 2)), { recursive: true });
      // written whole beside it, then moved into its name: a blob's name never stands on bytes that are not it
      const part = `${path(h)}.part-${process.pid}-${Math.random().toString(36).slice(2)}`;
      try {
        await Bun.write(part, bytes);
        if ((await stat(part)).size !== bytes.length) throw new Error(`blob ${h}: written short (is the disk full?)`);
        await rename(part, path(h));
      } catch (e) {
        await rm(part, { force: true });
        throw e;
      }
      return keyOf(h);
    },
    async get(h) {
      const f = Bun.file(path(h));
      if (!(await f.exists())) return null;
      const bytes = new Uint8Array(await f.arrayBuffer());
      checked(h, bytes);
      return bytes;
    },
    url: (h) => `${publicBase}/${h}`,
  };
}

/** whether a failed call to a bucket is worth asking again: a timeout, a dropped connection, a 5xx or "slow down" is;
 *  a missing key, refused access, or bytes not hashing to their name are not */
export function transient(e: unknown): boolean {
  const x = e as { code?: unknown; name?: unknown; message?: unknown } | null;
  const code = String(x?.code ?? "");
  if (/^(NoSuchKey|NotFound|AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch|NoSuchBucket|InvalidBucketName)$/.test(code)) return false;
  if (/hashing to|not a hash|is not set/.test(String(x?.message ?? ""))) return false;
  return true;
}

export interface Steady {
  /** how many times it is asked in all (default 6) */
  tries?: number;
  /** how long each try may take to answer, ms (default 120 s) */
  timeoutMs?: number;
  /** the first wait between tries, ms, doubling each time with a jitter (default 500 ms: about 15 s over 6 tries) */
  waitMs?: number;
}

/** a call to a remote store held steady: each try given its time to answer, a failed or silent one asked again */
export async function steady<T>(what: string, op: () => Promise<T>, o: Steady = {}): Promise<T> {
  const tries = o.tries ?? 6, timeoutMs = o.timeoutMs ?? 120_000, waitMs = o.waitMs ?? 500;
  for (let i = 1; ; i++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const silent = new Promise<never>((_, no) => {
        timer = setTimeout(() => no(Object.assign(new Error(`${what}: no answer within ${timeoutMs / 1000} s`), { code: "Timeout" })), timeoutMs);
      });
      return await Promise.race([op(), silent]);
    } catch (e) {
      if (i >= tries || !transient(e)) throw e;
      await new Promise((r) => setTimeout(r, waitMs * 2 ** (i - 1) * (0.5 + Math.random())));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** the bucket, its files under `root` (play's own: blobs/; the backups' store: BACKUPS/play-files/blobs) */
export function bucketStore(env = process.env, root = "blobs", hold: Steady = {}): BlobStore {
  const need = (k: string) => env[k] || (() => { throw new Error(`${k} is not set`); })();
  const client = new Bun.S3Client({
    bucket: need("PLAY_BUCKET"),
    endpoint: need("PLAY_BUCKET_ENDPOINT"),
    region: env.PLAY_BUCKET_REGION || undefined,
    accessKeyId: need("PLAY_BUCKET_ACCESS_KEY"),
    secretAccessKey: need("PLAY_BUCKET_SECRET_KEY"),
  });
  const key = (h: string) => `${root}/${keyOf(h).slice("blobs/".length)}`;
  return {
    has: (h) => steady(`has ${h}`, () => client.exists(key(h)), hold),
    size: (h) =>
      steady(`size ${h}`, async () => {
        try {
          return (await client.stat(key(h))).size;
        } catch (e) {
          // a missing key answers its stat with an error; one that is there and still errs is asked again
          if (!(await client.exists(key(h)))) return null;
          throw e;
        }
      }, hold),
    async put(h, bytes, mediaType) {
      checked(h, bytes);
      await steady(`put ${h}`, () => client.write(key(h), bytes, { type: mediaType }), hold);
      return keyOf(h);
    },
    get: (h) =>
      steady(`get ${h}`, async () => {
        const f = client.file(key(h));
        if (!(await f.exists())) return null;
        const bytes = new Uint8Array(await f.arrayBuffer());
        checked(h, bytes);
        return bytes;
      }, hold),
    url: (h, seconds = 3600) => client.presign(key(h), { expiresIn: seconds }),
    typeOf: (h) => steady(`type ${h}`, async () => (await client.stat(key(h))).type || null, hold),
  };
}

/**
 * Every file in two places: `primary` (play's own store) and `mirror` (a second copy, written through on every put).
 * A file the primary doesn't hand back whole (missing, cut short, not hashing to its name, or not answering after its
 * tries) is read from the mirror, checked against its hash, and put back into the primary.
 */
export function mirroredStore(primary: BlobStore, mirror: BlobStore, log: (s: string) => void = (s) => console.warn(s)): BlobStore {
  async function healed(h: string, why: string): Promise<Uint8Array | null> {
    const bytes = await mirror.get(h).catch((e) => (log(`blobs: ${h} not readable from the mirror either (${(e as Error).message})`), null));
    if (!bytes) return null;
    const type = (await mirror.typeOf?.(h).catch(() => null)) || "application/octet-stream";
    await primary.put(h, bytes, type).then(
      () => log(`blobs: ${h} ${why}: put back from the mirror`),
      (e) => log(`blobs: ${h} ${why}: read from the mirror, not put back (${(e as Error).message})`),
    );
    return bytes;
  }
  return {
    has: async (h) => (await primary.has(h).catch(() => false)) || (await mirror.has(h)),
    async size(h) {
      const n = await primary.size(h).catch(() => null);
      if (n !== null) return n;
      // not in the primary: the mirror's copy, put back now, so the primary holds every file again
      const bytes = await healed(h, "missing");
      return bytes ? bytes.length : null;
    },
    async put(h, bytes, mediaType) {
      const k = await primary.put(h, bytes, mediaType);
      // the second copy, at once: a failure here is logged (the next deploy's backup adds it to the same store)
      await mirror.put(h, bytes, mediaType).catch((e) => log(`blobs: ${h} not written to the mirror (${(e as Error).message})`));
      return k;
    },
    async get(h) {
      let failed: unknown = null;
      try {
        const bytes = await primary.get(h);
        if (bytes) return bytes;
      } catch (e) {
        failed = e;
      }
      const bytes = await healed(h, failed ? `not handed back whole (${(failed as Error).message})` : "missing");
      if (bytes) return bytes;
      if (failed) throw failed;
      return null;
    },
    url: (h, seconds) => primary.url(h, seconds),
    typeOf: (h) => primary.typeOf?.(h) ?? Promise.resolve(null),
  };
}

/** files never change: the ones handed out kept in memory, up to `maxBytes` in all (the least lately read go first) */
export function cachedStore(inner: BlobStore, maxBytes: number): BlobStore {
  const kept = new Map<string, Uint8Array>();
  let total = 0;
  return {
    ...inner,
    async get(h) {
      const hit = kept.get(h);
      if (hit) {
        kept.delete(h);
        kept.set(h, hit);
        return hit;
      }
      const bytes = await inner.get(h);
      // one file never takes more than a quarter of the room
      if (bytes && bytes.length <= maxBytes / 4) {
        kept.set(h, bytes);
        total += bytes.length;
        for (const [k, b] of kept) {
          if (total <= maxBytes) break;
          kept.delete(k);
          total -= b.length;
        }
      }
      return bytes;
    },
  };
}

/**
 * The bucket where PLAY_BUCKET is set, else the folder PLAY_BLOBS (default ./blobs). In the bucket, with
 * PLAY_MIRROR_ROOT (the backups' store, BACKUPS/play-files/blobs) every file is kept twice and mended from its second
 * copy; and the files handed out are kept in memory, PLAY_CACHE_MB of them (default 256, 0: none).
 */
export function blobStore(env = process.env): BlobStore {
  if (!env.PLAY_BUCKET) return folderStore(env.PLAY_BLOBS || "blobs");
  let store = bucketStore(env);
  if (env.PLAY_MIRROR_ROOT) store = mirroredStore(store, bucketStore(env, env.PLAY_MIRROR_ROOT));
  const mb = Number(env.PLAY_CACHE_MB ?? 256);
  return mb > 0 ? cachedStore(store, mb * 1024 * 1024) : store;
}
