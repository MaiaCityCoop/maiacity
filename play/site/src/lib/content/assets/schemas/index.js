/*
 * THE ASSET SCHEMAS — one place that names them:
 *
 * - `asset` (./asset.v1.json): an asset's record (title, group, name, version, note, licence, its files by role, tags),
 *   as the legacy store kept it. An asset's versions are its history, its variants its kinds.
 * - `card` (./card.v2.json, v1 with the group `worlds`): what an asset's pack says of it (its size, parts, sliders, levels of detail). A file of the
 *   version, which play keeps as bytes by its hash; our checker (./check.js) reads it.
 *
 * Each is frozen by its version and the BLAKE3 hash of its bytes (./schemas.json, as the engines are in
 * ../../../kernel/sandbox/engines.json): `<name>.v<n>.json` is never changed or taken out, and a change is a
 * new version beside it. The hash names the bytes wherever they are kept.
 */
import ASSET from './asset.v1.json';
/* the card checked against its newest version: v2 takes every card v1 took, and a world's (group `worlds`) */
import CARD from './card.v2.json';
import { check, checkText } from './check.js';
export { ASSET, CARD, check, checkText };

/** a card checked: `{ ok: true, value }` or `{ ok: false, errors }` @param {unknown} card */
export const checkCard = (card) => (typeof card === 'string' ? checkText(CARD, card) : check(CARD, card));
