// Box engine 6 (intent 6fd5e63f, checks c3 and c4): frozen under its hash, it builds a recipe whose materials say what
// they are and hands back format 5 with each look; engine 5 builds the same recipe as it always did (format 4, no look).
import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { enginesOf } from '$lib/kernel/engines.js'
import { hashBytes, hashText } from '$lib/content/game/hash.js'

const code = `defineRecipe(function (require) {
var THREE = require('three');
return { meta: { group: 'plants', id: 'probe-leaf', version: 1, label: 'probe', params: [] }, build: function () {
  var g = new THREE.Group();
  var bark = new THREE.MeshStandardMaterial({ color: 0x6b4a2f }); bark.name = 'bark'; bark.userData.look = { kind: 'bark' };
  var leaf = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, side: THREE.DoubleSide, alphaTest: 0.5 }); leaf.name = 'leaf';
  leaf.userData.look = { kind: 'leaf', translucency: 0.7, flutter: 0.5, shader: function () {} };
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2, 6), bark));
  var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), leaf); m.position.y = 2; g.add(m);
  return g; } };
});`

const SITE = resolve(import.meta.dirname, '../../../../..')

/** the recipe built on frozen engine `v` in Bun (scripts/box-worker.ts: Bun's workers, as the census runs the box) */
function build(v: number): any {
	const dir = mkdtempSync(join(tmpdir(), 'engine-'))
	const recipe = join(dir, 'recipe.js')
	writeFileSync(recipe, code)
	const script = `import { boxWorker } from ${JSON.stringify(join(SITE, 'scripts/box-worker.ts'))};
import { hashText } from ${JSON.stringify(join(SITE, 'src/lib/content/game/hash.js'))};
const code = await Bun.file(${JSON.stringify(recipe)}).text();
const w = boxWorker(${v})();
const t = setTimeout(() => (console.log(JSON.stringify({ ok: false, error: 'no answer' })), process.exit(1)), 30000);
w.onmessage = (e) => { const [m] = e.data; if (m.id !== 1) return; clearTimeout(t); console.log(JSON.stringify({ ok: m.ok, error: m.error, card: m.card, data: m.data && { format: m.data.format, materials: m.data.materials } })); process.exit(0); };
w.postMessage({ id: 1, op: 'build', recipe: { hash: hashText(code), code }, args: [], engine: ${v} });`
	const out = execFileSync('bun', ['-e', script], { cwd: SITE, encoding: 'utf8', timeout: 60000 })
	return JSON.parse(out.trim().split('\n').at(-1)!)
}

describe('box engine 6', () => {
	test('is frozen under its hash, beside engines 1 to 5', () => {
		const box = enginesOf('box') as { v: number; blake3: string; bytes: number }[]
		// (engine 7 and later beside it: intent a5faafad's graphs, scripts/engine.test.ts)
		expect(box.map((e) => e.v).slice(0, 6)).toEqual([1, 2, 3, 4, 5, 6])
		const six = box[5]!
		const bytes = readFileSync(join(SITE, 'static/engines/engine-v6.js'))
		expect(hashBytes(bytes)).toBe(six.blake3)
		expect(bytes.length).toBe(six.bytes)
	})

	test("hands back format 5, each material's look as plain data", () => {
		const r = build(6)
		expect(r.ok).toBe(true)
		expect(r.data.format).toBe(5)
		expect(r.data.materials.map((m: any) => [m.name, m.look])).toEqual([
			['bark', { kind: 'bark' }],
			['leaf', { kind: 'leaf', translucency: 0.7, flutter: 0.5 }]
		])
		expect(r.card.engine).toBe(6)
	}, 60000)

	test('engine 5 builds it as it always did: format 4, no look', () => {
		const r = build(5)
		expect(r.ok).toBe(true)
		expect(r.data.format).toBe(4)
		for (const m of r.data.materials) expect(m.look).toBeUndefined()
	}, 60000)
})
