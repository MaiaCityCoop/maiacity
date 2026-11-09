// Preloaded into a Mac job's script in its dry run (intent cb52fbd9; `bun --preload`): `playwright` is the CPU page
// (./playwright.ts), whether the script imports it or requires it (createRequire, as the jobs do), and the clock warps.
import { plugin } from 'bun';
import Module from 'node:module';
import './clock';

const SHIM = `${import.meta.dir}/playwright.ts`;
const M = Module as any;
const resolveFilename = M._resolveFilename;
M._resolveFilename = function (request: string, ...rest: unknown[]) {
	return request === 'playwright' || request === '@playwright/test' ? SHIM : resolveFilename.call(this, request, ...rest);
};
plugin({
	name: 'dry-playwright',
	setup(b) {
		b.onResolve({ filter: /^(playwright|@playwright\/test)$/ }, () => ({ path: SHIM }));
	}
});

// a job's own servers (its proxy to play on 3911) take a free port: no browser reaches them here, and two dry runs side
// by side would otherwise fight over one
import http from 'node:http';
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (this: http.Server, ...a: any[]) {
	if (typeof a[0] === 'number') a[0] = 0;
	else if (a[0] && typeof a[0] === 'object' && 'port' in a[0]) a[0] = { ...a[0], port: 0 };
	return listen.apply(this, a as any);
} as typeof listen;
