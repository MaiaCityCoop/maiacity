// BLAKE3, the one hash of play: a file is named by the hash of its bytes, a version by the hash of its content.
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export const hashBytes = (b: Uint8Array): string => bytesToHex(blake3(b));
export const hashText = (s: string): string => hashBytes(utf8ToBytes(s));
export const HASH = /^[0-9a-f]{64}$/;

/** JSON with object keys sorted at every depth: the same value always gives the same text */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
}
