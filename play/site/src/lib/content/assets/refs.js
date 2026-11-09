/*
 * REFS — one way to name an asset at a version, `group/id@v[:variant][?parameters]`, and to build one with the values
 * its recipe declares (./params.js): `plants/apple@2?seed=maia&stage=9`. The page and the box's engine both use it.
 */
import { argsOf, paramsIn, queryOf, valuesOf } from './params.js';

/**
 * A ref as its parts; `params` as text, undefined when it names none. @param {string} ref
 * @returns {{ group: string, id: string, v?: number, variant?: string, params?: Record<string, string> }}
 */
export function parseRef(ref) {
	const m = /^([a-z]+)\/([^@:?]+)(?:@(\d+))?(?::([^?]+))?(?:\?(.*))?$/.exec(ref);
	if (!m) throw new Error(`not an asset ref: ${ref} (group/id@v)`);
	const params = paramsIn(m[5]);
	return { group: m[1], id: m[2], v: m[3] ? Number(m[3]) : undefined, variant: m[4], ...(params && { params }) };
}

/**
 * The ref of an asset at a version (and a variant, and its parameters' values, sorted).
 * @param {string} group @param {string} id @param {number} [v] @param {string} [variant] @param {Record<string, unknown>} [values]
 */
export function refOf(group, id, v, variant, values) {
	const q = queryOf(values);
	return `${group}/${id}${v ? `@${v}` : ''}${variant ? `:${variant}` : ''}${q ? `?${q}` : ''}`;
}

/**
 * Builds an object with a builder and what it declares it takes (./params.js): the values `given` (a ref's, as text),
 * else `args` in their order, else its own; a builder that declares none takes `args` as they are. A builder may make
 * its object or a rig that carries it, at once or in time. The object comes with its ref (`userData.ref`): `ref`, the
 * name of the version it was built from, and every value it was built with.
 * @param {{ build: (...args: any[]) => any, params?: import('./params.js').Param[], ref: string }} recipe
 * @param {Record<string, string>} [given] @param {unknown[]} [args]
 * @returns {Promise<import('three').Object3D>}
 */
export async function buildWith({ build, params = [], ref }, given, args = []) {
	if (given && !params.length) throw new Error(`${ref} takes no parameters`);
	const values = params.length ? valuesOf(params, given, args) : undefined;
	const made = await (values ? build(...argsOf(params, values)) : build(...args));
	const obj = made?.isObject3D ? made : made?.rig?.object;
	if (!obj?.isObject3D) throw new Error(`${ref}: its builder made no object`);
	const q = queryOf(values);
	obj.userData.ref = q ? `${ref}?${q}` : ref;
	return obj;
}
