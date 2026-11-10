// Everything on play is admins' only by default (intent aa751ecb, check c1): every route of the site, as found on disk,
// is in the one table of rights or needs admin; the one gate ($lib/site/gate), rendered signed out, as a traveler and a
// citizen (whose rules give nothing, play.level_rules) and as an admin, shows "Coming soon" and none of the page to all
// but the admin; a level whose rule gives a route's right opens it, with no change to the table; and the root layout
// wraps every page in the gate, no page keeping a check of its own.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { session } from '$lib/session.svelte';
import type { Me } from '$lib/api';
import Gate from './Gate.svelte';
import { RIGHTS, gate, needOf } from './rights';

const routesDir = new URL('../../../routes/', import.meta.url);
/** every page of the site, as SvelteKit serves it: each folder with a +page.svelte, a [param] as a UUID */
const PAGES = (function walk(dir: URL, path: string): string[] {
	const here = readdirSync(dir, { withFileTypes: true });
	const mine = here.some((e) => e.name === '+page.svelte') ? [path || '/'] : [];
	return [
		...mine,
		...here.filter((e) => e.isDirectory()).flatMap((e) => walk(new URL(e.name + '/', dir), `${path}/${/^\[.+\]$/.test(e.name) ? '0b6f2c1e-5f3a-4b7e-9a51-2d4c8e1f7a90' : e.name}`))
	];
})(routesDir, '');
const OPEN = ['/', '/profile'];

const RULES: Record<string, Me['may']> = { traveler: {}, citizen: {}, admin: { read: ['*'], propose: ['*'], decide: ['*'], manage: ['members', 'invites'] } };
const member = (level: Me['level'], may = RULES[level]): Me => ({ id: '7d1f3a52-0c4e-4b8a-9f61-3e2a5b7c9d10', name: 'Ada', level, may, founder: null });
/** the page behind the gate: what would start a world, fetch an asset or a file */
const page = createRawSnippet(() => ({ render: () => '<div id="page">THE PAGE</div>' }));
const drawn = (path: string, who: Me | null, ready = true) => {
	session.ready = ready;
	session.me = who;
	return render(Gate, { props: { path, children: page } }).body;
};

describe('admins only by default', () => {
	it('finds the site\'s pages, and every table row is one of them', () => {
		expect(PAGES.length).toBeGreaterThan(30);
		for (const p of ['/', '/profile', '/assets', '/plants', '/sandbox-1', '/game', '/game/map', '/stories', '/postgres', '/worlds/bench'])
			expect(PAGES, p).toContain(p);
		for (const [route] of RIGHTS) expect(PAGES, route).toContain(route);
	});

	it('only the home page and the profile are open; a route the table does not name needs admin', () => {
		for (const p of PAGES) expect('open' in needOf(p), p).toBe(OPEN.includes(p));
		for (const p of ['/postgres', '/intents', '/library', '/artifacts', '/factories', '/game-editor', '/characters', '/no-such-page', '/assetsx'])
			expect(needOf(p), p).toEqual({ admin: true });
		expect(needOf('/plants/0b6f2c1e-5f3a-4b7e-9a51-2d4c8e1f7a90')).toEqual({ read: 'assets' });
		expect(needOf('/sandbox-1/')).toEqual({ read: 'sandboxes' });
		expect(needOf('/game/map/')).toEqual({ read: 'game' });
		expect(needOf('/stories/')).toEqual({ read: 'stories' });
	});

	for (const path of PAGES) {
		it(`${path}: ${OPEN.includes(path) ? 'open to everyone' : 'coming soon signed out, to a traveler and a citizen, nothing while loading, the page to an admin'}`, () => {
			if (OPEN.includes(path)) {
				for (const who of [null, member('traveler'), member('citizen'), member('admin')]) expect(drawn(path, who, who !== null)).toContain('THE PAGE');
				return;
			}
			for (const who of [null, member('traveler'), member('citizen')]) {
				const out = drawn(path, who);
				expect(out).toContain('Coming soon');
				expect(out).toContain('Invite only');
				expect(out).not.toContain('THE PAGE');
			}
			expect(drawn(path, null)).toContain('Sign in');
			for (const who of [null, member('traveler'), member('admin')]) {
				const out = drawn(path, who, false);
				expect(out).not.toContain('THE PAGE');
				expect(out).not.toContain('Coming soon');
			}
			const out = drawn(path, member('admin'));
			expect(out).toContain('THE PAGE');
			expect(out).not.toContain('Coming soon');
		});
	}

	it('a level opens a route once its rule gives the right, with no change to the table', () => {
		const reader = member('traveler', { read: ['assets'] });
		expect(gate('/plants/', true, reader)).toBe('open');
		expect(gate('/assets/', true, reader)).toBe('open');
		expect(gate('/sandbox-1/', true, reader)).toBe('soon');
		expect(gate('/postgres/', true, reader)).toBe('soon');
		expect(gate('/sandbox-3/', true, member('citizen', { read: ['sandboxes'] }))).toBe('open');
		expect(gate('/game/map/', true, member('citizen', { read: ['game'] }))).toBe('open');
		// a right never opens a page that needs admin
		expect(gate('/postgres/', true, member('citizen', { read: ['postgres', 'tables'] }))).toBe('soon');
	});

	it('the root layout wraps every page in the gate, and no gated page keeps an admins\' check of its own', () => {
		const layout = readFileSync(new URL('+layout.svelte', routesDir), 'utf8');
		expect(layout.match(/<Gate path=\{page\.url\.pathname\}>\{@render children\(\)\}<\/Gate>/g)).toHaveLength(2);
		const pages = (function walk(dir: URL): URL[] {
			return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(new URL(e.name + '/', dir)) : e.name === '+page.svelte' ? [new URL(e.name, dir)] : []));
		})(routesDir);
		expect(pages.length).toBe(PAGES.length);
		// (the profile is open to every member: what in it is an admin's, their access tokens, it shows them alone)
		for (const f of pages.filter((f) => !f.pathname.endsWith('/routes/+page.svelte') && !f.pathname.endsWith('/profile/+page.svelte')))
			expect(readFileSync(f, 'utf8'), f.pathname).not.toMatch(/adminsOnly|\{#if admin\}/);
	});
});
