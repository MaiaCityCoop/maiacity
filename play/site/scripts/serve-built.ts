#!/usr/bin/env bun
/*
 * THE SITE'S BUILD, SERVED AS PLAY SERVES IT (intent 7af6e162) — for a Mac job: play/site's static build (`build/`, from
 * `bun run build`) by play-api's own handler (play/api/src/site.ts: its files, its fallback page 200.html, its headers),
 * and /api to `api` (the job's read-only proxy). Not `vite preview`, under which the asset box never built (the render
 * box, 2026-11-08), and not the dev server, which transforms every module on a first load.
 *
 *   bun scripts/serve-built.ts <port> [api]     (from a tree's play/site, its build made)
 */
import { join } from 'node:path';
import { siteHandler } from '../../api/src/site.ts';

const port = Number(process.argv[2]);
const api = (process.argv[3] ?? 'http://localhost:3911').replace(/\/$/, '');
if (!port) throw new Error('serve-built: give a port');
const site = siteHandler(join(import.meta.dir, '../build'));
Bun.serve({
	port,
	hostname: '127.0.0.1',
	idleTimeout: 0,
	fetch(req) {
		const u = new URL(req.url);
		if (u.pathname === '/api' || u.pathname.startsWith('/api/')) return fetch(api + u.pathname + u.search, { method: req.method, headers: req.headers, body: req.body });
		return site(req);
	}
});
console.log(`serve-built: http://localhost:${port} (play/site/build, /api to ${api})`);
