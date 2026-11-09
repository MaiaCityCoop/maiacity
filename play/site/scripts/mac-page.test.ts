/*
 * A Mac job's browser keeps a page's files between jobs (intent 7af6e162, c4): a file written to OPFS through
 * ./mac-page.mjs's profile is there when that profile is opened again, and not in another site's; a site is served as
 * its production build (`serveBuilt`), not the dev server. Chromium, no WebGL.
 *
 *   cd play/site && bun test scripts/mac-page.test.ts
 */
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openSite, profileOf, serveBuilt } from './mac-page.mjs';

// a fresh runner has Playwright's package but not its browser: fetched once, with what it needs (as intents-reach.ts)
beforeAll(async () => {
	const { chromium } = await import('playwright');
	const b = await chromium.launch().catch(() => {
		const got = Bun.spawnSync(['bunx', 'playwright', 'install', '--with-deps', 'chromium-headless-shell'], { cwd: join(import.meta.dir, '..'), stdout: 'inherit', stderr: 'inherit' });
		if (!got.success) throw new Error('Playwright could not install its browser');
		return chromium.launch();
	});
	await b.close();
}, 300_000);

const root = mkdtempSync(join(tmpdir(), 'mac-page-'));
const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response('<!doctype html><title>page</title>', { headers: { 'content-type': 'text/html' } }) });
const url = `http://127.0.0.1:${server.port}/`;
afterAll(() => {
	server.stop(true);
	rmSync(root, { recursive: true, force: true });
});

/** opens `site`'s profile, runs `f` in a page at the server's origin, and closes it again */
async function inPage<T>(site: string, f: () => Promise<T>): Promise<T> {
	const ctx = await openSite(site, { root });
	try {
		const page = await ctx.newPage();
		await page.goto(url);
		return await page.evaluate(f);
	} finally {
		await ctx.close();
	}
}

test('a file kept in OPFS is there when the same profile opens again, and only there', async () => {
	const write = async () => {
		const d = await navigator.storage.getDirectory();
		const w = await (await d.getFileHandle('kept', { create: true })).createWritable();
		await w.write('picture by hash');
		await w.close();
		return true;
	};
	const read = async () => {
		const d = await navigator.storage.getDirectory();
		try {
			return await (await (await d.getFileHandle('kept')).getFile()).text();
		} catch {
			return null;
		}
	};
	expect(await inPage('base', write)).toBe(true);
	expect(await inPage('base', read)).toBe('picture by hash');
	expect(await inPage('head', read)).toBe(null);
}, 60_000);

test("a site's profile is its own folder, named by a plain word", () => {
	expect(profileOf('base', '/r')).toBe('/r/base');
	expect(() => profileOf('../x', '/r')).toThrow();
});

test("a site is served as play serves its build: Sandbox 1's page, its built scripts and the asset box's engines, no dev server", async () => {
	const site = await serveBuilt(join(import.meta.dir, '..'), { port: 5399, api: 'http://127.0.0.1:9', log: join(root, 'serve.log') });
	try {
		const html = await (await fetch(`${site.url}/sandbox-1/`)).text();
		expect(html).toContain('/_app/immutable/');
		expect(html).not.toContain('/@vite/client');
		// the asset box's frozen engines, as play serves them: each one's bytes its hash (kernel/sandbox/engines.json)
		const { blake3 } = await import('@noble/hashes/blake3.js');
		const { bytesToHex } = await import('@noble/hashes/utils.js');
		const engines = (await import('../src/lib/kernel/sandbox/engines.json')).default.box as { v: number; blake3: string }[];
		for (const e of engines) {
			const r = await fetch(`${site.url}/engines/engine-v${e.v}.js`);
			expect(r.headers.get('content-type')).toBe('text/javascript');
			expect(bytesToHex(blake3(new Uint8Array(await r.arrayBuffer())))).toBe(e.blake3);
		}
	} finally {
		site.stop();
	}
}, 300_000);
