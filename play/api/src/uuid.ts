// Asset ids are UUIDs (play/SPEC.md §3): a new asset's random; the legacy import derived an imported one's from the
// entry it came from (RFC 4122 version 5, SHA-1 over play's namespace and the entry's name), so its ids stay as they were.
import { createHash, randomUUID } from "node:crypto";

/** play's namespace for name-based ids */
const NAMESPACE = "6f1c2b8e-5d4a-4c3b-9e2f-7a8b9c0d1e2f";

const bytesOf = (uuid: string) => Buffer.from(uuid.replace(/-/g, ""), "hex");
const format = (b: Buffer) => {
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export function uuidv5(name: string, namespace = NAMESPACE): string {
  const hash = createHash("sha1").update(bytesOf(namespace)).update(name, "utf8").digest().subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return format(Buffer.from(hash));
}

export const newId = () => randomUUID();
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * The UUID a thing that was once named by a readable id is known by from then on (Samuel 2026-11-04: every reference
 * is a UUID or a hash; a name is only shown): RFC 9562 version 8, the first 16 bytes of SHA-256 over "play:<name>".
 * Migration 0017-uuids computes the same in SQL (play.uuid_of), so the ids it gave the stories, sandboxes and the
 * coop are the ones the repo's seeds name. Nothing new is made this way: a new thing gets a random UUID.
 */
export function uuidOf(name: string): string {
  const b = createHash("sha256").update(`play:${name}`, "utf8").digest().subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x80;
  b[8] = (b[8] & 0x3f) | 0x80;
  return format(Buffer.from(b));
}
