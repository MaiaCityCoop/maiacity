#!/usr/bin/env node
/*
 * A recipe's meshes checked for what draws black on some GPUs, before it is proposed: positions, normals, colours or
 * UVs that are not numbers, and normals of no length. On Apple's GPUs one such vertex (with a bump picture, even a
 * triangle of no area) makes NaN pixels, and play's viewer once blurred one NaN over the whole frame (banana v2's first
 * proposal showed black on an iPad). Every mesh should go through `sound()` (references/banana-v2.js) when it is merged.
 *
 *   node .claude/skills/plant-skill/scripts/nan-check.cjs <source.js> <id> <v> [stages, e.g. 0,4,9]
 *
 * It builds every stage (or the ones given) as the plant and as its fruit, at detail 1 and 0.3, and prints each mesh
 * that is not clean; "clean" for a build with none.
 */
const Module = require('module');
const path = require('path');
const SITE = process.env.PLAY_SITE ?? path.resolve(__dirname, '../../../../play/site');
const original = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) {
	if (req === 'three') return original.call(this, path.join(SITE, 'node_modules/three/build/three.cjs'), ...a);
	if (req.startsWith('three/addons/')) return original.call(this, path.join(SITE, 'node_modules/three/examples/jsm', req.slice(13)), ...a);
	return original.call(this, req, ...a);
};
process.removeAllListeners('warning');
const [file, id, v, only] = process.argv.slice(2);
const { meta, build } = require(path.resolve(file)).recipe(id, Number(v));
const stages = only ? only.split(',').map(Number) : (meta.params.find((p) => p.id === 'stage')?.names ?? [0]).map((_, i) => i);
let bad = 0;
for (const stage of stages)
	for (const fruit of [0, 1])
		for (const detail of [1, 0.3]) {
			const g = build(stage, 'maia', detail, fruit);
			const out = [];
			g.traverse((o) => {
				if (!o.isMesh) return;
				const a = o.geometry.attributes;
				let nan = 0, zero = 0;
				for (let i = 0; i < a.position.count; i++) {
					const vals = [a.position.getX(i), a.position.getY(i), a.position.getZ(i)];
					if (a.color) vals.push(a.color.getX(i), a.color.getY(i), a.color.getZ(i));
					if (a.uv) vals.push(a.uv.getX(i), a.uv.getY(i));
					const n = [a.normal.getX(i), a.normal.getY(i), a.normal.getZ(i)];
					if (![...vals, ...n].every(Number.isFinite)) nan++;
					else if (Math.hypot(...n) < 1e-6) zero++;
				}
				if (nan + zero) out.push(`${o.material.type}: ${a.position.count} vertices, ${nan} not numbers, ${zero} normals of no length`);
			});
			bad += out.length;
			console.log(`stage ${stage} fruit ${fruit} detail ${detail}: ${out.length ? '\n  ' + out.join('\n  ') : 'clean'}`);
		}
process.exit(bad ? 1 : 0);
