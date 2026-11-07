//#region src/lib/actors/parts.js
/** @typedef {import('./rig').V3} V3 */
/** @typedef {import('./rig').Pose} Pose */
/** @typedef {import('./rig').Piece} Piece */
/** @typedef {import('./rig').BoneSpec} BoneSpec */
/**
* @typedef {object} Assembly a group of parts that is built and works together (the frame, a wheel module, the power cube)
* @property {string} id
* @property {string} label
* @property {string} note what it is and does, in a sentence or two
* @property {V3} out which way it is drawn out of the machine in the exploded view (m)
*/
/**
* @typedef {object} PartInfo one part's card
* @property {string} id
* @property {string} label
* @property {string} assembly its assembly's id
* @property {string} what what it is and what it is for
* @property {string} [moves] how it moves (a part that does not move has none)
* @property {string} [drive] what moves it, or what it drives
* @property {[string, string][]} [specs] its numbers, as label and value
* @property {number} [count] how many of it the machine has, where one card stands for several alike
* @property {number} step the build step it goes on at (1 first)
* @property {string} [source] where its numbers come from (a source's label in the catalog)
* @property {string} [unit] a unit it comes in with, already built (the Power Cube in the LifeTrac): in the build,
*   all of a unit's parts arrive together, as one
* @property {string} [ref] the asset it came with, at its version, when it was carried in from another
*   (`machines/powercube@3`, $lib/assets)
*/
/**
* @typedef {object} Catalog a machine's parts: its assemblies, its parts' cards, its build steps and its sources
* @property {Assembly[]} assemblies
* @property {PartInfo[]} parts
* @property {string[]} steps the build steps, in order: what each does
* @property {{ label: string, url: string }[]} sources
*/
/**
* A kit to build a machine of parts.
* @param {Assembly[]} assemblies
