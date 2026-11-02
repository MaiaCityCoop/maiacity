// @ts-nocheck
// play's game configs (cloned from legacy's maia/content/game/code/index.js, which read them from the Maia City vault):
// play's own, bundled with the site (./configs.json, made by play/site/scripts/configs.mjs), each asset named by its
// ref. `loadCode` is kept for the worlds that wait on it.
import CONFIGS from './configs.json';

export class CodeError extends Error {}

/** the config at `ref` (`configs/<game>/<name>`), or CodeError */
export function configAt(ref) {
	if (!Object.hasOwn(CONFIGS, ref)) throw new CodeError(`play keeps no config ${ref}`);
	return CONFIGS[ref];
}

/** every config is bundled: nothing to load */
export const loadCode = async () => ({ ok: true });
