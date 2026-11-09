/*
 * VERSIONS of what is still versioned in code (the biomes, $lib/content/biomes): each item carries a version number and
 * its history, the latest built by its own builder, an older one by the frozen builder its history names. Everything
 * began at v1 (5 October 2026). Assets are versioned on play (play/SPEC.md §4.15), not here.
 */

/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
 * @template B
 * @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
 *   latest's, or a frozen one), not the latest's standing in for one that was not kept
 */

/** The first version of everything: what every item was when versions began. */
const FIRST = /** @type {Change} */ ({ v: 1, date: '2026-10-05', note: 'First version' });

/**
 * An item's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
 * ones before the latest bring their own (frozen) builders. With no history the item is at v1.
 * @template B
 * @param {B} current the item's builder today
 * @param {(Change & { build?: B })[]} [history]
 * @returns {Version<B>[]}
 */
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return { v: c.v, date: c.date, note: c.note, build: latest ? current : /** @type {B} */ (c.build ?? current), kept: latest || c.build !== undefined };
	});
}

/**
 * Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
 * `version` its latest number.
 * @template {{ id: string }} T
 * @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
 * @returns {(T & { versions: Version<any>[], version: number })[]}
 */
export function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return { ...it, versions, version: versions[versions.length - 1]?.v ?? 1 };
	});
}
