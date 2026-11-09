// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * AN ENTRY'S FILE — a value as bytes, as it is kept (`packed`) and read back (`unpacked`): what a build is made of (plain
 * objects and arrays, strings, numbers, booleans, null and undefined, typed arrays and array buffers) and nothing else,
 * kept so that what is read back is what was kept, bit for bit:
 *
 *   'mca' 1 | the JSON's length | the arrays' length | 0 (each a uint32) | the JSON | its arrays
 *
 * The JSON is `{parts, value}`: the value with each typed array or buffer in it as a mark `{"\u0000": n}`, n its place
 * in `parts`, each part its kind and where its bytes are among the arrays (each beginning at a multiple of 8). One array
 * in two places of the value is one part, as it was one array. A number no JSON holds (NaN, ±Infinity, -0), an undefined
 * and an object with a key that is the mark's own are marked too. A file of another length than its header gives, or
 * whose marks name bytes it doesn't hold, is refused, as is anything else that doesn't read: a page that finds an entry
 * refused builds it again.
 */
import { utf8ToBytes } from '@noble/hashes/utils.js';

/** the key of a mark */
const MARK = '\u0000';
/** an entry's file's first bytes, and the bytes of its header */
const MAGIC = [0x6d, 0x63, 0x61, 1], HEAD = 16;
/** the typed arrays a file keeps, by their kind */
const ARRAYS = Object.fromEntries(
	['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float16Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 'DataView']
		.filter((k) => typeof globalThis[k] === 'function')
		.map((k) => [k, globalThis[k]])
);
/** `n` up to the next multiple of 8 */
const eight = (n) => Math.ceil(n / 8) * 8;
/** the numbers no JSON holds, as they are marked */
const NUMBERS = ['NaN', 'Infinity', '-Infinity', '-0'];

/** A value as an entry's file; throws for one that holds anything a build isn't made of. @returns {Uint8Array} */
export function packed(value) {
	/** @type {Map<object, number>} */
	const at = new Map();
	/** @type {[string, number, number][]} */
	const parts = [];
	/** @type {Uint8Array[]} */
	const bytes = [];
	let size = 0;
	const plain = (v) => {
		if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
		if (typeof v === 'number') return Number.isFinite(v) && !Object.is(v, -0) ? v : { [MARK]: 'number', v: Object.is(v, -0) ? '-0' : String(v) };
		if (v === undefined) return { [MARK]: 'undefined' };
		if (typeof v !== 'object') throw new Error(`a ${typeof v} is no part of a build`);
		const kind = v instanceof ArrayBuffer ? 'ArrayBuffer' : ArrayBuffer.isView(v) ? Object.prototype.toString.call(v).slice(8, -1) : null;
		if (kind) {
			if (!at.has(v)) {
				if (kind !== 'ArrayBuffer' && !ARRAYS[kind]) throw new Error(`a ${kind} is no part of a build`);
				const b = kind === 'ArrayBuffer' ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
				at.set(v, parts.length);
				parts.push([kind, size, b.byteLength]);
				bytes.push(b);
				size += eight(b.byteLength);
			}
			return { [MARK]: at.get(v) };
		}
		if (Array.isArray(v)) return Array.from(v, (x) => plain(x));
		const proto = Object.getPrototypeOf(v);
		if (proto !== Object.prototype && proto !== null) throw new Error('only plain objects are part of a build');
		const entries = Object.keys(v).map((k) => [k, plain(v[k])]);
		return Object.hasOwn(v, MARK) ? { [MARK]: 'object', v: entries } : Object.fromEntries(entries);
	};
	const json = utf8ToBytes(JSON.stringify({ parts, value: plain(value) }));
	const start = HEAD + eight(json.byteLength);
	const file = new Uint8Array(start + size);
	file.set(MAGIC);
	const head = new DataView(file.buffer);
	head.setUint32(4, json.byteLength, true);
	head.setUint32(8, size, true);
	file.set(json, HEAD);
	parts.forEach(([, from], i) => file.set(bytes[i], start + from));
	return file;
}

/** An entry's file as the value it keeps, each array its own; throws (refused) for one that doesn't read. */
export function unpacked(file) {
	const refused = (why) => new Error(`refused: ${why}`);
	if (!(file instanceof Uint8Array) || file.byteLength < HEAD || MAGIC.some((b, i) => file[i] !== b)) throw refused('no file of the cache');
	const head = new DataView(file.buffer, file.byteOffset, HEAD);
	const length = head.getUint32(4, true), size = head.getUint32(8, true);
	const start = HEAD + eight(length);
	if (start + size !== file.byteLength) throw refused('a file of the cache cut short, or too long');
	const { parts, value } = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(file.subarray(HEAD, HEAD + length)));
	if (!Array.isArray(parts)) throw refused('a file of the cache without its parts');
	const arrays = parts.map((p) => {
		const [kind, from, n] = Array.isArray(p) ? p : [];
		const make = kind === 'ArrayBuffer' ? undefined : ARRAYS[kind];
		if (kind !== 'ArrayBuffer' && !make) throw refused(`a ${kind} in a file of the cache`);
		if (!Number.isSafeInteger(from) || !Number.isSafeInteger(n) || from < 0 || n < 0 || from + n > size || n % (make?.BYTES_PER_ELEMENT ?? 1)) throw refused('a part that is not in its file');
		const at = file.byteOffset + start + from;
		const buffer = file.buffer.slice(at, at + n);
		return make ? new make(buffer) : buffer;
	});
	const real = (v) => {
		if (Array.isArray(v)) return v.map(real);
		if (!v || typeof v !== 'object') return v;
		if (!Object.hasOwn(v, MARK)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, real(x)]));
		const m = v[MARK];
		if (Number.isInteger(m) && m >= 0 && m < arrays.length) return arrays[m];
		if (m === 'undefined') return undefined;
		if (m === 'number' && NUMBERS.includes(v.v)) return Number(v.v);
		if (m === 'object' && Array.isArray(v.v) && v.v.every((e) => Array.isArray(e) && typeof e[0] === 'string')) return Object.fromEntries(v.v.map(([k, x]) => [k, real(x)]));
		throw refused('a mark no file of the cache makes');
	};
	return real(value);
}
