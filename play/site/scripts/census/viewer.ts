#!/usr/bin/env bun
/*
 * ASSETS IN THE VIEWER, DRAWN ON THE CPU (intent 660ad67f): each asset named (its UUID) built as the asset viewer
 * builds it (sources/viewer.js `vaultBuild` in the census's headless box, hero.js `forStage`, stage.js `Stage` under
 * the sky), then drawn by three's real WebGLRenderer on the kit's fake WebGL (../../src/lib/content/render/nodes/fakegl.js),
 * which throws on a vector uniform given no sequence, as a browser does. Prints one JSON line: each asset's outcome
 * (drawn, or its error and where it came from); exits 1 if any is not drawn. `--group` adds every asset of a group,
 * `--intent` builds each as that intent's variant would make it where it holds one (8823eb7c), `--root` runs another
 * tree's play/site (main's, to see a regression), this script's census the same.
 *
 *   bun play/site/scripts/census/viewer.ts [<asset uuid>…] [--group <group>] [--intent <uuid>] [--root <tree>/play/site]
 */
import { join, resolve } from 'node:path';

import { setup, lib, frame } from './setup';

const argv = process.argv.slice(2);
const flag = (f: string) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined);
const root = flag('--root') && resolve(flag('--root')!);
const [group, intent] = [flag('--group'), flag('--intent')];
const ids = argv.filter((a, i) => /^[0-9a-f-]{36}$/.test(a) && argv[i - 1] !== '--intent');
// play read live (the assets' newest versions; PLAY_MCP_TOKEN, the header to play only)
setup({ root });
const g = globalThis as any;
const THREE = await import(join(import.meta.dir, '../../node_modules/three/build/three.module.js'));
const { fakeGL } = await import(lib('content/render/nodes/fakegl.js'));
const { install } = await import(lib('content/render/nodes/index.js'));
const { catalogReady } = await import(lib('recipes'));
await catalogReady();
const { source, INDEX } = await import(lib('content/assets/catalog.js'));
const { AssetBox } = await import(lib('content/assets/box/host.js'));
const { vaultBuild } = await import(lib('content/assets/sources/viewer.js'));
const { forStage, heroOf } = await import(lib('content/assets/hero.js'));
const { Stage } = await import(lib('content/assets/stage.js'));

/** a promise, the page's clock turned while it is open */
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
const out: { id: string; label?: string; step: string; ok: boolean; error?: string }[] = [];
for (const id of ids) {
	let step = 'read';
	const r: (typeof out)[number] = { id, step, ok: false };
	try {
		const chain = await (await fetch(`/api/assets/${id}`)).json();
		const v = chain.versions[0];
		r.label = chain.label;
		const mine = intent ? await fetch(`/api/assets/${id}/recipe?intent=${intent}`) : null;
		const hash = mine?.ok ? (await mine.json()).hash : (v.recipe ?? v.variants?.find((x: any) => x.name === v.defaultVariant)?.recipe ?? v.variants?.[0]?.recipe);
		step = 'build';
		const got = await turning(vaultBuild(source, hash, {}, { box, keep: false }));
		step = 'stage';
		const { gl } = fakeGL();
		// no multisampled render-to-texture: three draws the stage's targets as plain WebGL2 does
		const ext = gl.getExtension;
		gl.getExtension = (n: string) => (/multisampled_render_to_texture/i.test(n) ? null : ext(n));
		const renderer = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl });
		renderer.shadowMap.enabled = true;
		install(renderer);
		const camera = new THREE.PerspectiveCamera(40, 1440 / 900, 0.05, 2000);
		const stage = new Stage(renderer, camera, { sky: true });
		(g.__stage = stage), (g.__renderer = renderer);
		forStage(got.obj);
		const { centre, size } = stage.show(got.obj, { asset: heroOf(got) });
		camera.position.copy(centre).add(new THREE.Vector3(1, 0.6, 1.4).multiplyScalar(size.length()));
		camera.lookAt(centre);
		step = 'compile';
		await turning(stage.compile());
		step = 'draw';
		for (let i = 0; i < 4; i++) {
			stage.update(1 / 60);
			stage.render();
		}
		r.ok = true;
	} catch (e: any) {
		r.error = String(e?.message ?? e).slice(0, 400);
		if (process.env.STACK) console.error(e?.stack);
		// which texture slot was handed what (the frame's uploads: each material's list of the program's uniforms)
		if (process.env.STACK && g.__stage)
			g.__stage.scene.traverse((o: any) => {
				for (const m of [o.material].flat().filter(Boolean)) {
					const pr = g.__renderer.properties.get(m);
					for (const u of pr?.uniformsList ?? []) {
						const v = pr.uniforms?.[u.id]?.value;
						if (/T1|TCube|T2DArray|T3D/.test(u.setValue?.name ?? '') && !(v && typeof v === 'object')) console.error(`  ${o.name || o.type} ${m.name || m.type}: ${u.id} (${u.setValue.name}) = ${String(v)} [${typeof v}]`);
					}
				}
			});
	}
	r.step = step;
	out.push(r);
	console.error(`viewer: ${r.label ?? id} ${r.ok ? 'drawn' : `failed at ${step}: ${r.error}`}`);
}
console.log(JSON.stringify({ assets: out }));
process.exit(out.every((r) => r.ok) ? 0 : 1);
