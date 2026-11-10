/*
 * A WORLD'S PINNED INPUTS — play's answers kept beside the code (./inputs), read by everything that builds a world
 * without play: the census (./setup.ts) and a world on a real GPU (../gpu.ts). A file is kept by its hash
 * (`files/<hash>.gz`: what a hash names never changes), a route by its URL (`<sha256 of the route, 20 hex>.json.gz`:
 * its status, type and body as play answered).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { hashOf } from '../../src/lib/content/assets/box/headless.js';

export type Route = { route: string; status: number; type: string; blake3: string; body: string };

const fileAt = (inputs: string, hash: string) => join(inputs, 'files', `${hash}.gz`);
const routeAt = (inputs: string, route: string) => join(inputs, `${createHash('sha256').update(route).digest('hex').slice(0, 20)}.json.gz`);

/** the hash a route names, where it is a file's (`/api/files/<hash>`) */
export const fileOf = (pathname: string) => /^\/api\/files\/([0-9a-f]{64})$/.exec(pathname)?.[1];

/** a pinned file's bytes, held to its hash, or null where it is not pinned */
export function pinnedFile(inputs: string, hash: string): Uint8Array | null {
	if (!existsSync(fileAt(inputs, hash))) return null;
	const bytes = gunzipSync(readFileSync(fileAt(inputs, hash)));
	if (hashOf(bytes) !== hash) throw new Error(`pinned: the file ${hash.slice(0, 12)}… is not what its hash names`);
	return bytes;
}

/** a pinned route's answer, or null where it is not pinned */
export function pinnedRoute(inputs: string, route: string): Route | null {
	return existsSync(routeAt(inputs, route)) ? JSON.parse(gunzipSync(readFileSync(routeAt(inputs, route))).toString('utf8')) : null;
}

/** pins a file (refused unless the bytes are what its hash names) */
export function pinFile(inputs: string, hash: string, bytes: Uint8Array) {
	if (hashOf(bytes) !== hash) throw new Error(`pinned: the file ${hash.slice(0, 12)}… is not what its hash names`);
	mkdirSync(join(inputs, 'files'), { recursive: true });
	writeFileSync(fileAt(inputs, hash), gzipSync(bytes, { level: 9 }));
}

/** pins a route's answer as play gave it */
export function pinRoute(inputs: string, route: string, status: number, type: string, body: string) {
	writeFileSync(routeAt(inputs, route), gzipSync(JSON.stringify({ route, status, type, blake3: hashOf(body), body } satisfies Route), { level: 9 }));
}
