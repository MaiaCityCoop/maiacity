/*
 * THE FACTORIES — every production line play shows (/factories/): a whole factory as a live 3D miniature on a real
 * discrete event simulation (AirSup's factory skill, .claude/skills/factory-skill; its runtime as legacy ported it,
 * cloned into play from the branch SNAPSHOT_2611101's maia/content/factories on 2026-11-03: des.js the engine,
 * kit.js the machines, world.js the hall, look.js the lens, app.js the page, each with our additions marked
 * "maiaCITY").
 *
 * What a factory is lives in play's Postgres, not here (Samuel 2026-11-04, play/SPEC.md §4.7): each is a Loro document
 * of type factory/1 (play/api/src/factories.ts), read from /api/docs/<id>, changed only by proposal. This file
 * turns such a document into what the runtime reads: its line, every station's cycle time the sum of what it does for one
 * unit (its parts' operations and its own handling) unless the station gives its own, and its note written from them;
 * and the bill of process the page lists beside it. The engine, the kit and the shapes stay code here
 * (./lifetrac-kit.js: the LifeTrac line's machines and shapes).
 */

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * @typedef {{ at: string, s: number, what?: string }} Op one operation: at which station, for how many seconds for one unit's worth
 * @typedef {{ id: string, label: string, assembly?: string, qty: number, raw?: Record<string, any>, ops: Op[] }} Part
 * @typedef {{ schema: 'factory/1', label: string, note?: string, from?: string, builds?: string, line: any, stock?: Record<string, { label: string }>, assemblies?: { id: string, label: string }[], parts: Part[], handling?: Record<string, Op[]> }} FactoryDoc
 */

/**
 * A factory's document, as the page and the runtime use it.
 * @param {FactoryDoc} doc
 */
export function lineOf(doc) {
	const parts = doc.parts ?? [];
	const handling = doc.handling ?? {};
	const product = doc.line.product?.name ?? 'unit';
	/** everything station `st` does for one unit: each part's operations there, then its own handling */
	const opsAt = (st) => {
		const out = [];
		for (const p of parts) for (const o of p.ops) if (o.at === st) out.push({ ...o, part: p.id, label: p.label });
		for (const o of handling[st] ?? []) out.push({ ...o, part: null, label: 'Station handling' });
		return out;
	};
	/** a station's cycle time for one unit: the sum of what it does, s */
	const contentOf = (st) => r1(opsAt(st).reduce((s, o) => s + o.s, 0));
	/** the note a station's inspector shows: how much it does for one unit, the biggest of it, and its machine's rate */
	const noteOf = (st) => {
		const ops = opsAt(st.id).filter((o) => o.s > 0).sort((a, b) => b.s - a.s);
		const n = new Set(ops.filter((o) => o.part).map((o) => o.part)).size;
		const top = ops.slice(0, 3).map((o) => `${o.label} ${Math.round(o.s)} s`).join(', ');
		return `${st.what ?? ''} ${n} part${n === 1 ? '' : 's'} of every ${product} pass here, ${ops.length} operations, ${Math.round(contentOf(st.id)).toLocaleString('en-US')} s in all${top ? ` (the most: ${top})` : ''}.${st.rate ? ` ${st.rate}` : ''}`.trim();
	};
	const spec = {
		...doc.line,
		stations: doc.line.stations.map((s) => ({ ...s, ct: typeof s.ct === 'number' ? s.ct : contentOf(s.id), note: typeof s.note === 'string' ? s.note : noteOf(s) }))
	};
	const totals = {
		parts: parts.length,
		pieces: parts.reduce((s, p) => s + (p.qty ?? 0), 0),
		made: parts.filter((p) => p.raw?.stock).length,
		bought: parts.filter((p) => !p.raw?.stock).length,
		kg: r1(parts.reduce((s, p) => s + (p.raw?.kg ?? 0), 0))
	};
	return { spec, parts, stock: doc.stock ?? {}, assemblies: doc.assemblies ?? [], product, opsAt, contentOf, totals };
}
