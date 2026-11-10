// @ts-nocheck — plain JS, kept loose on purpose
/**
 * THE ONE HASH — every name of bytes that never change (an engine, a recipe, a piece, a build, a file of play's) is their
 * BLAKE3 in lower-case hex, made here alone so nothing names the same bytes two ways; a text is hashed as its UTF-8.
 */
import { blake3 } from '@noble/hashes/blake3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/** a hash as text: 64 lower-case hex digits, for a pattern that holds one among other text */
export const HEX = '[0-9a-f]{64}';
export const HASH = new RegExp(`^${HEX}$`);
/** whether `x` is a hash @param {unknown} x */
export const isHash = (x) => typeof x === 'string' && HASH.test(x);

/** BLAKE3 of bytes, in hex @param {Uint8Array} bytes @returns {string} */
export const hashBytes = (bytes) => bytesToHex(blake3(bytes));

/** BLAKE3 of a text's UTF-8 bytes, in hex @param {string} text @returns {string} */
export const hashText = (text) => hashBytes(utf8ToBytes(text));

/** whether `bytes` are the bytes `hash` names @param {unknown} bytes @param {string} hash */
export const holds = (bytes, hash) => bytes instanceof Uint8Array && hashBytes(bytes) === hash;
