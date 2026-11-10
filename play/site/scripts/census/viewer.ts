#!/usr/bin/env bun
/*
 * ASSETS IN THE VIEWER, BUILT ON THE CPU (intent 660ad67f): each asset named (its UUID) read, built as the asset viewer
 * builds it (load.js `vaultBuild` in the census's headless box) and staged (hero.js `forStage`, stage.js `Stage` under
 * the sky, on the renderer the page makes: render/core.js `makeRenderer`, the census's counting one). Nothing is drawn
 * (intent 2bcd9eaa): play draws with WebGPU only, and the Mac's smoke run checks real drawing. Prints one JSON line:
 * each asset's outcome (built, or its error and the step it came from); exits 1 if any is not built. `--group` adds every asset of a group,
 * `--intent` builds each as that intent's variant would make it where it holds one (8823eb7c), `--root` runs another
 * tree's play/site (main's, to see a regression), this script's census the same.
 *
 * `--count` (intent 009e04d3) counts each asset as staged: the camera put on it as the viewer first frames it (viewer.js
 * `camerawork`), the stage's own frames turned as the page's loop turns them (its update, then its frame through its
 * post pipeline), and what one settled frame would draw read from the asset's own counting renderer: `tris` and `draws`
 * (every pass: the scene's, the shadow's, the targets'; each also on its own), counted, still not drawn. `--total tris` or `--total draws` (it counts
 * too) prints that sum over the assets named as the last line, after the JSON line, a number alone.
 *
 * play's routes are read as pinned in ./inputs, as the census reads them; `--record` reads every route live and pins it anew
 * (PLAY_MCP_TOKEN), so a chain pinned before an Accept is never built stale again (e5ddf0b2).
 *
 *   bun play/site/scripts/census/viewer.ts [<asset uuid>…] [--group <group>] [--intent <uuid>] [--root <tree>/play/site] [--record] [--count] [--total tris|draws]
 */
import { join, resolve } from 'node:path';

import { setup, lib, frame } from './setup';

const argv = process.argv.slice(2);
const flag = (f: string) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
const root = flag('--root') && resolve(flag('--root')!);
const [group, intent] = [flag('--group'), flag('--intent')];
const ids = argv.filter((a, i) => /^[0-9a-f-]{36}$/.test(a) && argv[i - 1] !== '--intent');
const total = flag('--total');
if (argv.includes('--total') && total !== 'tris' && total !== 'draws') throw new Error('viewer: --total tris or --total draws');
const count = argv.includes('--count') || !!total;
// play's routes as pinned in ./inputs (no token: a check sees none), `--record` pinning what it reads live (PLAY_MCP_TOKEN)
setup({ root, inputs: join(import.meta.dir, 'inputs'), record: argv.includes('--record'), fresh: true });
const THREE = await import(join(import.meta.dir, '../../node_modules/three/build/three.module.js'));
const { makeRenderer } = await import(lib('content/render/core.js'));
const { catalogReady } = await import(lib('recipes'));
await catalogReady();
const { source, INDEX, admitProposed } = await import(lib('content/assets/catalog.js'));
const { AssetBox } = await import(lib('content/assets/box/host.js'));
const { vaultBuild } = await import(lib('content/assets/load.js'));
const { forStage, heroOf } = await import(lib('content/assets/hero.js'));
const { Stage } = await import(lib('content/assets/stage.js'));
const { camerawork } = await import(lib('content/assets/viewer.js'));
// a frame of the stage as the page's loop turns it (VaultAsset.svelte): its update, then its own frame
const { update: turn, render: draw } = Stage.prototype;

async function turning<T>(p: Promise<T>) {
	let done = false;
	const q = p.finally(() => (done = true));
	while (!done) {
		frame();
		await new Promise((r) => setTimeout(r, 5));
	}
	return q;
}

if (group) ids.push(...(await (await fetch(`/api/assets?group=${group}`)).json()).map((a: any) => a.id).filter((id: string) => !ids.includes(id)));
const box = new AssetBox({ engine: INDEX.engine });
type Counts = { tris: number; draws: number; mainTris: number; mainDraws: number; shadowTris: number; shadowDraws: number; targetTris: number; targetDraws: number };
const out: ({ id: string; label?: string; step: string; ok: boolean; built?: true; error?: string } & Partial<Counts>)[] = [];
for (const id of ids) {
	let step = 'read';
	const r: (typeof out)[number] = { id, step, ok: false };
	try {
		const chain = await (await fetch(`/api/assets/${id}`)).json();
		const v = chain.versions[0];
		r.label = chain.label;
		// the intent's variant as the page admits a proposed build (AssetLibrary.svelte), else the newest version
		const mine = intent ? await fetch(`/api/assets/${id}/recipe?intent=${intent}`) : null;
		const proposed = mine?.ok ? await mine.json() : null;
		if (proposed) await admitProposed([proposed]);
		const hash = proposed?.hash ?? v.recipe ?? v.variants?.find((x: any) => x.name === v.defaultVariant)?.recipe ?? v.variants?.[0]?.recipe;
		step = 'build';
		const got = await turning(vaultBuild(source, hash, {}, { box, keep: false }));
		step = 'stage';
		// the viewer's renderer and camera as its page makes them (viewer.js openStage: render/stage.js createStageRenderer)
		const renderer = await makeRenderer({ pixelRatio: 1, shadows: 'pcf' });
		const camera = new THREE.PerspectiveCamera(40, 1440 / 900, 0.05, 2000);
		const stage = new Stage(renderer, camera, { sky: true });
		forStage(got.obj);
		const { centre, size } = stage.show(got.obj, { asset: heroOf(got) });
		if (count) {
			step = 'count';
			// the camera on it as the viewer first frames it, looking at what its controls would aim at
			const controls = { target: new THREE.Vector3() };
			camerawork(THREE, camera, controls).reframe(centre, size, { fresh: true });
			camera.lookAt(controls.target);
			// it stands built: its parts fly in by the wall clock on the page, and no clock is read for a count
			stage.built = 1;
			await stage.compile();
			// the frame counted is a settled one, the third: the first also draws what is drawn once and kept (the key's
			// shadow map, which the stage draws again only when what casts into it changed)
			for (let i = 0; i < 3; i++) {
				renderer.tally.reset();
				turn.call(stage, 1 / 60);
				draw.call(stage);
			}
			const t = renderer.tally;
			Object.assign(r, { tris: t.tris + t.shadowTris + t.targetTris, draws: t.calls + t.shadowCalls + t.targetCalls, mainTris: t.tris, mainDraws: t.calls, shadowTris: t.shadowTris, shadowDraws: t.shadowCalls, targetTris: t.targetTris, targetDraws: t.targetCalls });
		}
		r.ok = r.built = true;
	} catch (e: any) {
		r.error = String(e?.message ?? e).slice(0, 400);
		if (process.env.STACK) console.error(e?.stack);
	}
	r.step = step;
	out.push(r);
	console.error(`viewer: ${r.label ?? id} ${r.ok ? `built${count ? `: ${r.tris} triangles, ${r.draws} draws` : ''}` : `failed at ${step}: ${r.error}`}`);
}
console.log(JSON.stringify({ assets: out }));
if (total) console.log(String(out.reduce((a, r) => a + ((total === 'tris' ? r.tris : r.draws) ?? 0), 0)));
process.exit(out.every((r) => r.ok) ? 0 : 1);
