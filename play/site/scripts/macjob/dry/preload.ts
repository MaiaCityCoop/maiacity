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
