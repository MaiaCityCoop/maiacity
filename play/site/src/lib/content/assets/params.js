/*
 * An asset's parameters, declared by its recipe (a plant's stage and seed), so any build has one name (../../kernel/builds.js,
 * `<recipe hash>?seed=maia&stage=9`); a ref's values are checked against the declaration (range, length, nothing
 * undeclared) before the recipe runs, in the page and the box alike.
 */

/**
 * @typedef {{
 *   id: string, label: string, type: 'number' | 'integer' | 'string', value: number | string,
 *   min?: number, max?: number, step?: number, names?: string[], maxLength?: number
 * }} Param one parameter as a recipe declares it: `value` is what it takes when not given; `names` names the whole
 *   numbers of a range (a plant's stages)
 */
/** @typedef {Record<string, number | string>} Values */

/** how long a string parameter may be when its recipe does not say */
const MAX_LENGTH = 80;

/** One parameter's value checked, from a ref's text or a recipe's argument. @param {Param} p @param {unknown} raw @returns {number | string} */
function valueOf(p, raw) {
	if (p.type === 'string') {
		const s = String(raw);
		if (s.length > (p.maxLength ?? MAX_LENGTH)) throw new Error(`${p.id}: longer than ${p.maxLength ?? MAX_LENGTH}`);
		return s;
	}
	const x = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
	if (!Number.isFinite(x)) throw new Error(`${p.id}: not a number`);
	if (p.type === 'integer' && !Number.isInteger(x)) throw new Error(`${p.id}: not a whole number`);
	if ((p.min !== undefined && x < p.min) || (p.max !== undefined && x > p.max)) throw new Error(`${p.id}: ${x} is out of ${p.min ?? '…'}–${p.max ?? '…'}`);
	return x;
}

/** Every declared parameter's value: a ref's (`given`, text), else the recipe's arguments in order (`args`), else its
 * `value`; throws for one undeclared or out of shape.
 * @param {Param[]} params @param {Record<string, string>} [given] @param {unknown[]} [args] @returns {Values} */
export function valuesOf(params, given = {}, args = []) {
	const known = new Set(params.map((p) => p.id));
	for (const k of Object.keys(given)) if (!known.has(k)) throw new Error(`no parameter ${k}${known.size ? ` (${[...known].join(', ')})` : ''}`);
	if (args.length > params.length) throw new Error(`${args.length} arguments for ${params.length} parameters`);
	/** @type {Values} */
	const out = {};
	params.forEach((p, i) => {
		const raw = Object.hasOwn(given, p.id) ? given[p.id] : args[i] !== undefined ? args[i] : p.value;
		out[p.id] = valueOf(p, raw);
	});
	return out;
}

/** the shape of a parameter's id, the same as the card's keys */
const KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;

/** A recipe's arguments, its parameters' values in their order. @param {Param[]} params @param {Values} values */
export const argsOf = (params, values) => params.map((p) => values[p.id]);

/** A ref's query: its values sorted by id as text (`seed=maia&stage=9`), the same values always alike; empty for none. @param {Record<string, unknown> | undefined} values */
export function queryOf(values) {
	if (!values) return '';
	const q = new URLSearchParams();
	for (const k of Object.keys(values).sort()) q.append(k, String(values[k]));
	return q.toString();
}

/** The values a ref's query names, as text; undefined for none; throws for an id out of shape or named twice.
 * @param {string | undefined} query @returns {Record<string, string> | undefined} */
export function paramsIn(query) {
	if (!query) return undefined;
	/** @type {Record<string, string>} */
	const out = {};
	for (const [k, v] of new URLSearchParams(query)) {
		if (!KEY.test(k)) throw new Error(`not a parameter: ${k.slice(0, 40)}`);
		if (Object.hasOwn(out, k)) throw new Error(`parameter ${k} named twice`);
		out[k] = v;
	}
	return Object.keys(out).length ? out : undefined;
}
