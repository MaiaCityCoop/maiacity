// @ts-nocheck — plain JS
/*
 * AN ASSET'S PARTS TREE from its card's catalog alone (./schemas/card.v1.json `catalog`), as every viewer listing parts
 * shows it (./Parts.svelte): its own parts by assembly, then each whole asset it carries (a Power Cube on a pickup's
 * bed, its `ref`) as one entry, that asset's parts by assembly under it.
 */

/**
 * The tree of `catalog`'s parts: `own` by assembly; `units`, each carried asset by ref, named as its host's catalog
 * names it ("Power Cube: Frame") else as play names its ref (`named`, `nameOf(ref)`: "Power Cube v3 · 1a2b3c4d…", the
 * ref where nothing does), with its page (`hrefOf(ref)`, null for none).
 * @param {any} catalog @param {string | undefined} own the asset's own ref (`machines/pickup@2`): a part of it is no unit
 * @param {(ref: string) => string | null} [hrefOf] @param {(ref: string) => string} [nameOf]
 * @returns {{ own: { a: any, parts: any[] }[], units: { ref: string, name: string, named: string, parts: any[], groups: { a: any, parts: any[] }[], href: string | null }[] }}
 */
export function treeOf(catalog, own, hrefOf = () => null, nameOf = (ref) => ref) {
	if (!catalog?.parts?.length) return { own: [], units: [] };
	const mine = (p) => !p.ref || p.ref === own;
	const byAssembly = (list) => (catalog.assemblies ?? []).map((a) => ({ a, parts: list.filter((p) => p.assembly === a.id) })).filter((x) => x.parts.length);
	const carried = new Map();
	for (const p of catalog.parts) if (!mine(p)) carried.set(p.ref, [...(carried.get(p.ref) ?? []), p]);
	return {
		own: byAssembly(catalog.parts.filter(mine)),
		units: [...carried].map(([ref, parts]) => {
			const groups = byAssembly(parts);
			const heads = groups.map((g) => (g.a.label.includes(':') ? g.a.label.split(':')[0].trim() : null));
			const named = nameOf(ref);
			const name = heads.length && heads.every((h) => h && h === heads[0]) ? heads[0] : named;
			return { ref, name, named, parts, groups, href: hrefOf(ref) };
		})
	};
}
