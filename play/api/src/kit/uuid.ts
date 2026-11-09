// Ids are UUIDs (play/SPEC.md §3): a new thing's random.
import { createHash, randomUUID } from "node:crypto";

const format = (b: Buffer) => {
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

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
