// Asset ids are UUIDs (play/SPEC.md §3): a new asset's random, an imported one's derived from the avenDB entry it came
// from (RFC 4122 version 5, SHA-1 over play's namespace and "avendb:<entry>"), so the same import gives the same ids.
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

/** an imported asset's id: the UUID of the avenDB entry it was */
export const assetIdOf = (entry: string) => uuidv5(`avendb:${entry}`);
