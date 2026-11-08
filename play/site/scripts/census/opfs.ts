/*
 * OPFS on disk, as much as play's asset cache uses (assets/cache.js): a root folder, folders in it, files read whole,
 * written whole (`createWritable`), removed and listed. The census's builds are kept here between runs, as a browser
 * keeps them, so a census run again reads its builds instead of building them anew.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const notFound = (name: string) => Object.assign(new Error(`${name}: not found`), { name: 'NotFoundError' });

function fileHandle(path: string, name: string) {
	return {
		kind: 'file' as const,
		name,
		async getFile() {
			if (!existsSync(path)) throw notFound(name);
			const bytes = readFileSync(path);
			return new File([bytes], name, { lastModified: statSync(path).mtimeMs });
		},
		async createWritable() {
			const parts: Uint8Array[] = [];
			return {
				async write(d: ArrayBufferView | ArrayBuffer | Blob | string) {
					if (typeof d === 'string') parts.push(new TextEncoder().encode(d));
					else if (d instanceof Blob) parts.push(new Uint8Array(await d.arrayBuffer()));
					else if (d instanceof ArrayBuffer) parts.push(new Uint8Array(d));
					else parts.push(new Uint8Array(d.buffer, d.byteOffset, d.byteLength));
				},
				async close() {
					writeFileSync(path, Buffer.concat(parts));
				},
				async abort() {}
			};
		}
	};
}

function dirHandle(path: string, name: string): any {
	mkdirSync(path, { recursive: true });
	return {
		kind: 'directory' as const,
		name,
		async getDirectoryHandle(n: string, o?: { create?: boolean }) {
			const p = join(path, n);
			if (!existsSync(p) && !o?.create) throw notFound(n);
			return dirHandle(p, n);
		},
		async getFileHandle(n: string, o?: { create?: boolean }) {
			const p = join(path, n);
			if (!existsSync(p)) {
				if (!o?.create) throw notFound(n);
				writeFileSync(p, new Uint8Array(0));
			}
			return fileHandle(p, n);
		},
		async removeEntry(n: string) {
			const p = join(path, n);
			if (!existsSync(p)) throw notFound(n);
			rmSync(p, { recursive: true, force: true });
		},
		async *entries() {
			for (const n of readdirSync(path)) {
				const p = join(path, n);
				yield [n, statSync(p).isDirectory() ? dirHandle(p, n) : fileHandle(p, n)];
			}
		},
		async *keys() {
			for (const n of readdirSync(path)) yield n;
		}
	};
}

export function opfs(root: string) {
	return { getDirectory: async () => dirHandle(root, ''), estimate: async () => ({ quota: 8e9, usage: 0 }), persist: async () => true, persisted: async () => true };
}
