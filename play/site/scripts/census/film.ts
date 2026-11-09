#!/usr/bin/env bun
/*
 * SANDBOX 1'S FILM ON THE CPU (intent 660ad67f): the village built as the census builds it (./setup.ts, pinned inputs),
 * then its film stepped as a film or story steps it (`window.__world.film.advance`, ../../src/lib/content/sandbox-kit/film.js)
 * at a few world times. Prints one JSON line: each time stepped, and where the glass's sun sheen points against the
 * sky's sun. Exits 1 on any throw.
 *
 *   bun play/site/scripts/census/film.ts
 */
import { join } from 'node:path';
import { setup, lib } from './setup';

setup({ inputs: join(import.meta.dir, 'inputs') });
const { mountSandbox1 } = await import('./run');
await mountSandbox1(() => {});
const g = globalThis as any;
const film = g.__world?.film;
if (!film?.advance) throw new Error('film: Sandbox 1 handed the film camera no world');
const { glassSheen } = await import(lib('content/sandbox-2/interior/interior'));
const sun = g.__world.scene.getObjectsByProperty('isSunLight', true)[0];
const steps = [];
for (const t of [0, 30, 600]) {
	film.advance(t);
	const u = glassSheen.uGlassSun.value;
	steps.push({ t, length: u.length(), dot: sun ? u.dot(sun.position.clone().normalize()) : null });
}
console.log(JSON.stringify({ steps }));
process.exit(0);
