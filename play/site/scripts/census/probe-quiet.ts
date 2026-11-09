// scratch: Sandbox 1 on the CPU, its assets' stats polled (not committed)
import { join } from 'node:path';
import { frame, setup } from './setup';
const root = process.argv[2] + "/play/site";
setup({ root, inputs: join(import.meta.dir, 'inputs'), cache: process.env.CENSUS_CACHE });
const { mount } = await import('./run');
const g = globalThis as any;
let up = false;
const t0 = performance.now();
const tick = () => { try { if (up) frame(); } catch (e) { console.error('frame', e); } setTimeout(tick, 16); };
tick();
await mount('sandbox-1', { log: () => {} });
up = true;
console.log('built', ((performance.now() - t0) / 1000).toFixed(0));
for (let i = 0; i < 24; i++) {
	await new Promise((r) => setTimeout(r, 5000));
	const s = g.window.__assets?.stats?.();
	const parts = s ? ['out', 'in', 'library'].map((k) => s[k]).filter(Boolean) : [];
	console.log(((performance.now() - t0) / 1000).toFixed(0), JSON.stringify((parts.length ? parts : [s]).map((p: any) => p && { b: p.building, k: p.keeping, t: p.taken, pic: p.pictures, pages: p.pages })));
}
process.exit(0);
