/*
 * The viewer census (./viewer.ts; intent 2bcd9eaa): one asset of each group read, built and staged as the asset viewer
 * builds it, from the pinned inputs, and nothing drawn: no compile or draw step, no fake WebGL.
 *
 *   cd play/site && bun test scripts/census -t 'viewer census builds'
 */
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HERE = import.meta.dir;

/** one asset of each group, by its UUID (the label only shown) */
const ONE_OF_EACH = [
	'34095282-709a-5a59-ac03-697ac77b8047', // biomes: Beech forest
	'65d10973-53bf-5485-8116-15ed2d85d38a', // plants: Black alder
	'a2cb88a1-d476-4542-abff-0adf16f0875e', // machines: Ambulance
	'2eb0865d-7777-4f91-96a0-8420022301f5', // things: Armchair, round
	'12238392-18d3-4611-bb3a-16e99914f5d0', // buildings: Brutalist office tower
	'358c7b8a-a1c5-5c7a-aa13-a9a98fb488dc', // actors: Ant hill
	'c88b84db-3d48-4a85-8d21-a29f0c38610a' // worlds: Checkout
];

test(
	'viewer census builds',
	() => {
		const p = Bun.spawnSync(['bun', join(HERE, 'viewer.ts'), ...ONE_OF_EACH], { stdout: 'pipe', stderr: 'pipe' });
		const err = p.stderr.toString();
		const { assets } = JSON.parse(p.stdout.toString().trim().split('\n').pop()!);
		expect(assets.map((a: any) => a.id)).toEqual(ONE_OF_EACH);
		for (const a of assets) expect({ id: a.id, step: a.step, ok: a.ok, built: a.built, error: a.error }).toEqual({ id: a.id, step: 'stage', ok: true, built: true, error: undefined });
		expect(err.match(/^viewer: .* built$/gm)?.length).toBe(ONE_OF_EACH.length);
		expect(p.exitCode).toBe(0);
		// nothing drawn: no compile or draw step, no fake WebGL, no WebGL-era install
		const src = readFileSync(join(HERE, 'viewer.ts'), 'utf8');
		expect(src).not.toMatch(/step = '(compile|draw)'|fakegl|fakeGL|install\(|WebGLRenderer|\.render\(/);
	},
	600_000
);
