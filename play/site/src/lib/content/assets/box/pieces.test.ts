// A recipe names a piece by hash (play/SPEC.md §4.5; intent 5a15e468): the box resolves it from play's files, held to
// its hash, and the frozen engine builds the recipe with it. The engine is played here as it loads a recipe (engine
// v5: `self.defineRecipe` set, the script run, the function it was handed called with the engine's `require`).
import { afterEach, describe, expect, it } from 'vitest'
import { hashText } from '../../game/hash.js'
import { RECIPE_HEAD, recipeTail } from '../engines.js'
import { MOST_DEEP, piecesFor, resolved } from './pieces.js'

const g = globalThis as any
/** what the engine's require gives: its own modules, nothing else */
const engineRequire = (name: string) => {
	if (name === 'three') return { REVISION: '186' }
	if (name === 'three/addons/utils/BufferGeometryUtils.js') return { merged: true }
	throw new Error(`this engine has no module ${name}`)
}
/** the engine loading a recipe's script: what its recipe's build makes */
function inEngine(code: string) {
	let handed: any
	g.self = g
	g.defineRecipe = (f: any) => (handed ??= f)
	try {
		;(0, eval)(code)
	} finally {
		delete g.defineRecipe
	}
	const recipe = handed(engineRequire)
	return recipe.build()
}
const recipeFile = (source: string) => RECIPE_HEAD + source + recipeTail('test-piece', 1, null)
const piece = (source: string) => ({ source, hash: hashText(source), bytes: new TextEncoder().encode(source) })
const enc = (s: string) => new TextEncoder().encode(s)

const leaf = piece('const three = require("three");\nmodule.exports.size = 2;\nmodule.exports.three = three.REVISION;\n')
const mid = piece(`const leaf = require("${leaf.hash}");\nconst utils = require("three/addons/utils/BufferGeometryUtils.js");\nmodule.exports.twice = () => leaf.size * 2;\nmodule.exports.merged = utils.merged;\n`)
const files = new Map([leaf, mid].map((p) => [p.hash, p.bytes]))
const fileAt = async (h: string) => files.get(h) ?? null

afterEach(() => {
	delete g.fetch
})

describe('a recipe names a piece by hash', () => {
	it('builds a recipe requiring a piece, as it builds with the piece copied in', async () => {
		const code = recipeFile(`const leaf = require("${leaf.hash}");\nmodule.exports.recipe = function (id, v, variant) {\n\treturn { meta: { id, v, variant }, build: () => ({ size: leaf.size, three: leaf.three }) };\n};\n`)
		const r = await resolved({ hash: hashText(code), code, pieces: [leaf.hash] }, { fileAt })
		const copied = recipeFile(`const leaf = (function () { var module = { exports: {} }, exports = module.exports;\n${leaf.source}\nreturn module.exports; })();\nmodule.exports.recipe = function (id, v, variant) {\n\treturn { meta: { id, v, variant }, build: () => ({ size: leaf.size, three: leaf.three }) };\n};\n`)
		expect(inEngine(r.code)).toEqual({ size: 2, three: '186' })
		expect(inEngine(r.code)).toEqual(inEngine(copied))
		// its hash is the recipe file's own: the file is run as it is, after its pieces
		expect(r.hash).toBe(hashText(code))
		expect(r.code.endsWith(code)).toBe(true)
	})

	it('builds a recipe whose piece requires a piece (and three.js addons from the engine)', async () => {
		const code = recipeFile(`const mid = require("${mid.hash}");\nmodule.exports.recipe = function (id, v, variant) {\n\treturn { meta: { id, v, variant }, build: () => ({ four: mid.twice(), merged: mid.merged }) };\n};\n`)
		const r = await resolved({ hash: hashText(code), code, pieces: [mid.hash, leaf.hash] }, { fileAt })
		expect(inEngine(r.code)).toEqual({ four: 4, merged: true })
	})

	it('hands a recipe that requires no piece to the box as it is', async () => {
		const code = recipeFile('module.exports.recipe = function (id, v, variant) { return { meta: { id, v, variant }, build: () => 1 }; };\n')
		expect((await resolved({ hash: hashText(code), code })).code).toBe(code)
	})

	it('refuses a piece not held, a hash mismatch, a cycle, a chain more than 4 deep, or one not in the manifest, saying which', async () => {
		const needs = (h: string) => recipeFile(`const p = require("${h}");\nmodule.exports.recipe = function () { return { meta: {}, build: () => p }; };\n`)
		// not held
		const gone = hashText('nobody kept this')
		await expect(piecesFor(needs(gone), [gone], { fileAt })).rejects.toThrow(`piece ${gone.slice(0, 12)}… is not held among play's files`)
		// its bytes are not its hash
		await expect(piecesFor(needs(leaf.hash), [leaf.hash], { fileAt: async () => enc('module.exports = 1;\n') })).rejects.toThrow(`piece ${leaf.hash.slice(0, 12)}… does not hash to its name`)
		// not in the manifest: the recipe's own, and one a piece requires
		await expect(piecesFor(needs(leaf.hash), [], { fileAt })).rejects.toThrow(`requires piece ${leaf.hash.slice(0, 12)}…, which its manifest doesn't name`)
		await expect(piecesFor(needs(mid.hash), [mid.hash], { fileAt })).rejects.toThrow(`requires piece ${leaf.hash.slice(0, 12)}…, which its manifest doesn't name`)
		// a cycle (no bytes can hash to a name inside them, so only a store that lies could hand one: held as if true)
		const a = 'a'.repeat(64), b = 'b'.repeat(64)
		const lying = new Map([[a, enc(`require("${b}");\n`)], [b, enc(`require("${a}");\n`)]])
		await expect(piecesFor(needs(a), [a, b], { fileAt: async (h) => lying.get(h) ?? null, held: () => true })).rejects.toThrow(`piece ${a.slice(0, 12)}… requires itself`)
		// MOST_DEEP pieces deep builds; one more is refused
		const chain = [piece('module.exports = 1;\n')]
		for (let i = 1; i <= MOST_DEEP; i++) chain.push(piece(`module.exports = require("${chain[i - 1].hash}") + 1;\n`))
		const deep = new Map(chain.map((p) => [p.hash, p.bytes]))
		const all = chain.map((p) => p.hash)
		const four = chain[MOST_DEEP - 1], five = chain[MOST_DEEP]
		const ok = needs(four.hash)
		expect(inEngine((await resolved({ hash: hashText(ok), code: ok, pieces: all }, { fileAt: async (h) => deep.get(h) ?? null })).code)).toBe(MOST_DEEP)
		await expect(piecesFor(needs(five.hash), all, { fileAt: async (h) => deep.get(h) ?? null })).rejects.toThrow(`its pieces go more than ${MOST_DEEP} deep`)
	})

	it("reads a level's pieces at once, each once: a person's seven pieces in two round trips, not seven (intent 67d5e185)", async () => {
		// a person as the Stand-in stands: body, motion and two clips; the body on a skeleton, a head and the IK, the
		// motion on the IK too (met again on another path, read once)
		const skeleton = piece('module.exports = 1;\n'), head = piece('module.exports = 2;\n'), ik = piece('module.exports = 3;\n')
		const body = piece(`module.exports = require("${skeleton.hash}") + require("${head.hash}") + require("${ik.hash}");\n`)
		const motion = piece(`module.exports = require("${ik.hash}") * 10;\n`)
		const gait = piece('module.exports = 100;\n'), actions = piece('module.exports = 1000;\n')
		const all = [skeleton, head, ik, body, motion, gait, actions]
		const store = new Map(all.map((p) => [p.hash, p.bytes]))
		const reads: string[] = []
		const slow = async (h: string) => {
			reads.push(h)
			await new Promise((ok) => setTimeout(ok, 100))
			return store.get(h) ?? null
		}
		const code = recipeFile(`const a = require("${body.hash}"), b = require("${motion.hash}"), c = require("${gait.hash}"), d = require("${actions.hash}");\nmodule.exports.recipe = function () { return { meta: {}, build: () => a + b + c + d }; };\n`)
		const t = performance.now()
		const r = await resolved({ hash: hashText(code), code, pieces: all.map((p) => p.hash) }, { fileAt: slow })
		const ms = performance.now() - t
		expect(inEngine(r.code)).toBe(6 + 30 + 100 + 1000)
		expect(reads.length).toBe(7)
		expect(new Set(reads).size).toBe(7)
		// one after another this took 7 × 100 ms; a level at a time, two
		expect(ms).toBeLessThan(450)
		// listed as they are first met, depth first, as before
		const order = (await piecesFor(code, all.map((p) => p.hash), { fileAt: async (h) => store.get(h) ?? null })).map((p) => p.hash)
		expect(order).toEqual([body, skeleton, head, ik, motion, gait, actions].map((p) => p.hash))
	})

	it("reads pieces from play's files alone: no request leaves for any other origin", async () => {
		const asked: string[] = []
		g.fetch = async (url: string, init?: any) => {
			asked.push(String(url))
			expect(init?.credentials).toBe('same-origin')
			const h = String(url).replace('/api/files/', '')
			const b = files.get(h)
			return b ? new Response(b, { status: 200 }) : new Response('', { status: 404 })
		}
		const code = recipeFile(`const mid = require("${mid.hash}");\nmodule.exports.recipe = function () { return { meta: {}, build: () => mid.twice() }; };\n`)
		const r = await resolved({ hash: hashText(code), code, pieces: [mid.hash, leaf.hash] })
		expect(inEngine(r.code)).toBe(4)
		expect(asked.sort()).toEqual([`/api/files/${leaf.hash}`, `/api/files/${mid.hash}`].sort())
		// the worker's script itself names no address to load
		expect(r.code).not.toMatch(/importScripts|fetch\(|https?:\/\//)
	})
})
