/*
 * THE BOX'S ENGINES AND RECIPE FILES — the frozen box engines (kind `box` of ../../../kernel/engines.js: each version's
 * BLAKE3 hash and size, its file static/engines/engine-v<n>.js, made by scripts/freeze-engine.ts), and the shape of our
 * recipe file, so its hash names the same bytes wherever written: its asset's library (every version's builders and what
 * they share, bundled with three.js left to the engine) and one line naming the version and variant it builds. So each
 * asset, version and variant has its own file and hash, moving only when its own code, or code it shares, changes.
 */
import { engineAt as frozenAt, enginesOf } from '$lib/kernel/engines.js';

/**
 * @typedef {{ v: number, date: string, blake3: string, bytes: number, three: string, modules: string[], note: string }} Engine
 *   a frozen engine: version, date, its file's hash and size, its three.js, the modules a recipe may require, what it brought
 */

/** every frozen engine, oldest first @type {Engine[]} */
export const ENGINES = /** @type {Engine[]} */ (/** @type {unknown} */ (enginesOf('box')));

/** the latest engine: the one our recipes are made for */
export const LATEST = ENGINES[ENGINES.length - 1];

/** an engine by its version @param {number} v */
export const engineAt = (v) => /** @type {Engine | undefined} */ (/** @type {unknown} */ (frozenAt('box', v)));

/** The start of every recipe file: a script handing the engine one function that runs its library (strict) and gives the recipe. */
export const RECIPE_HEAD = 'defineRecipe(function (require) {\n"use strict";\nvar module = { exports: {} }, exports = module.exports;\n';

/** The end of one asset's recipe file: the line naming it. @param {string} id @param {number} v @param {string | null} [variant] */
export const recipeTail = (id, v, variant) => `\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant ?? null)});\n});\n`;

/** One asset's recipe file. @param {string} library the asset's library @param {string} id @param {number} v @param {string | null} [variant] */
export const recipeFile = (library, id, v, variant) => RECIPE_HEAD + library + recipeTail(id, v, variant);
