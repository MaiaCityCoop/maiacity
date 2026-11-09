/*
 * A Mac job's browser keeps a page's files between jobs (intent 7af6e162, c4): a file written to OPFS through
 * ./mac-page.mjs's profile is there when that profile is opened again, and not in another site's; a site is served as
 * its production build (`serveBuilt`), not the dev server. Chromium, no WebGL.
 *
 *   cd play/site && bun test scripts/mac-page.test.ts
 */
import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openSite, profileOf, serveBuilt } from './mac-page.mjs';

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

test("a site is served as its production build: Sandbox 1's page and its built scripts, no dev server's modules", async () => {
	const site = await serveBuilt(join(import.meta.dir, '..'), { port: 5399, api: 'http://127.0.0.1:9', log: join(root, 'serve.log') });
	try {
		const html = await (await fetch(`${site.url}/sandbox-1/`)).text();
		expect(html).toContain('/_app/immutable/');
		expect(html).not.toContain('/@vite/client');
	} finally {
		site.stop();
	}
}, 300_000);
