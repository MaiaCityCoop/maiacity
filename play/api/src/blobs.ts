// Where blobs live: the bucket (Hetzner Object Storage, S3's protocol) in production, a folder on disk in development
// and tests. Each blob is kept under its BLAKE3 hash and handed out only after its bytes are checked against it.
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { HASH, hashBytes } from "./hash";

export interface BlobStore {
  has(hash: string): Promise<boolean>;
  put(hash: string, bytes: Uint8Array, mediaType: string): Promise<string>; // returns its bucket key
  get(hash: string): Promise<Uint8Array | null>;
  /** a URL the browser may read it from for `seconds` */
  url(hash: string, seconds?: number): string;
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

export function bucketStore(env = process.env): BlobStore {
  const need = (k: string) => env[k] || (() => { throw new Error(`${k} is not set`); })();
  const client = new Bun.S3Client({
    bucket: need("PLAY_BUCKET"),
    endpoint: need("PLAY_BUCKET_ENDPOINT"),
    region: env.PLAY_BUCKET_REGION || undefined,
    accessKeyId: need("PLAY_BUCKET_ACCESS_KEY"),
    secretAccessKey: need("PLAY_BUCKET_SECRET_KEY"),
  });
  return {
    has: (h) => client.file(keyOf(h)).exists(),
    async put(h, bytes, mediaType) {
      checked(h, bytes);
      await client.write(keyOf(h), bytes, { type: mediaType });
      return keyOf(h);
    },
    async get(h) {
      const f = client.file(keyOf(h));
      if (!(await f.exists())) return null;
      const bytes = new Uint8Array(await f.arrayBuffer());
      checked(h, bytes);
      return bytes;
    },
    url: (h, seconds = 3600) => client.presign(keyOf(h), { expiresIn: seconds }),
  };
}

/** the bucket where PLAY_BUCKET is set, else the folder PLAY_BLOBS (default ./blobs) */
export const blobStore = (env = process.env): BlobStore =>
  env.PLAY_BUCKET ? bucketStore(env) : folderStore(env.PLAY_BLOBS || "blobs");
