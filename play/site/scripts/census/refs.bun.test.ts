/*
 * EVERY REFERENCE A UUID OR A HASH, IN THE MACHINES' RECIPES (intent e5ddf0b2; CLAUDE.md): no recipe of the machines
 * group, as play keeps it, names another asset by group, name and version (`machines/powercube@3`), a name play's
 * catalog does not know, so the asset viewer cannot find or link it. Each machine's newest version is read with all its
 * variants' recipe files, or, where intent e5ddf0b2 holds a variant of it, that variant's recipe (its work, before and
 * after its Accept), all as the census reads play: pinned in ./inputs. Comments are left out: a copied doc comment
 * that shows such a name as an example names nothing.
 *
 *   cd play/site && bun test scripts/census/refs.bun.test.ts
 *   CENSUS_RECORD=1 PLAY_MCP_TOKEN=… bun test scripts/census/refs.bun.test.ts   (reads play live and pins it anew)
 */
import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';

import { setup } from './setup';

const INTENT = 'e5ddf0b2-cc6d-4c82-90f9-b82c46916853';
const GROUPS = 'plants|things|machines|buildings|actors|characters|biomes|worlds';
/** a name of an asset by group, name and version (and variant), as a string in code */
const BY_NAME = new RegExp(`(["'\`])((?:${GROUPS})/[a-z0-9][a-z0-9-]*@\\d+(?::[a-z0-9-]+)?)\\1`, 'g');

/** a recipe file's code without its comments (block and line), its strings kept */
export function codeOf(text: string) {
	let out = '';
	for (let i = 0; i < text.length; ) {
		const c = text[i];
		if (c === '"' || c === "'" || c === '`') {
			let j = i + 1;
			while (j < text.length && text[j] !== c && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
			out += text.slice(i, j + 1);
			i = j + 1;
		} else if (c === '/' && text[i + 1] === '*') i = text.indexOf('*/', i + 2) < 0 ? text.length : text.indexOf('*/', i + 2) + 2;
		else if (c === '/' && text[i + 1] === '/') i = text.indexOf('\n', i) < 0 ? text.length : text.indexOf('\n', i);
		else (out += c), i++;
	}
	return out;
}

/** every asset named by group, name and version in a recipe file's code */
export const namedIn = (text: string) => [...codeOf(text).matchAll(BY_NAME)].map((m) => m[2]);

describe('codeOf and namedIn', () => {
	it('finds a name in code and none in a comment', () => {
		const text = '/* `machines/powercube@3`, $lib/assets */\n// "machines/van@2"\nkit.carry(pc, { ref: "machines/powercube@3", at: "a//b" });\n';
		expect(namedIn(text)).toEqual(['machines/powercube@3']);
		expect(namedIn('kit.carry(pc, { ref: "d263fb371f62595f0a2062bfdab1c70b3d5dc120a131d899cb7fbd0ef7befb67" });')).toEqual([]);
	});
});

describe("the machines' recipes", () => {
	it('name no other asset by group, name and version', async () => {
		setup({ inputs: join(import.meta.dir, 'inputs'), record: !!process.env.CENSUS_RECORD, fresh: true });
		const read = async (route: string) => {
			const r = await fetch(route);
			return r.ok ? r : null;
		};
		const list = await (await read('/api/assets?group=machines'))!.json();
		expect(list.length).toBeGreaterThan(20);
		const named: string[] = [];
		for (const { id } of list) {
			const chain = await (await read(`/api/assets/${id}`))!.json();
			const v = chain.versions[0];
			const mine = await read(`/api/assets/${id}/recipe?intent=${INTENT}`);
			const hashes: string[] = mine ? [(await mine.json()).hash] : [v.recipe, ...v.variants.map((x: { recipe: string }) => x.recipe)].filter(Boolean);
			for (const h of hashes) {
				const file = await read(`/api/files/${h}`);
				expect(file, `${chain.label} v${v.number}: its recipe ${h.slice(0, 12)}… is pinned`).not.toBeNull();
				for (const n of namedIn(await file!.text())) named.push(`${chain.label} v${v.number} (${h.slice(0, 12)}…) names ${n}`);
			}
		}
		expect(named).toEqual([]);
	}, 120_000);
});
