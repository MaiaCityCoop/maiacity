#!/usr/bin/env node
// play's sandbox configs, made once from legacy's (play/SPEC.md §5): legacy Sandbox 4's assets and garden become
// Sandbox 1's, each avenDB pin {entry, at} replaced by the ref it names (group/id@v[:variant][?values]) through the
// repo's table of pins (maia/content/assets/pins.fixture.json), the garden's plants as plants/<id>@<v>. Then they are
// play's own and drift from legacy's.
//
//   node play/site/scripts/configs.mjs        writes play/site/src/lib/content/game/code/configs.json
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../../../', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(ROOT + p, 'utf8'));
const fixture = read('maia/content/assets/pins.fixture.json');

const assets = {};
for (const [key, pin] of Object.entries(read('maia/content/code/configs/sandbox-4/assets/config.json'))) {
	const ref = fixture[`${pin.entry}@${[...pin.at].sort().join(',')}`];
	if (!ref) throw new Error(`sandbox-4 ${key}: no ref for pin ${pin.entry}`);
	assets[key] = ref;
}
const strip = (o) => {
	if (Array.isArray(o)) return o.map(strip);
	if (o && typeof o === 'object') {
		const { pin: _, ...rest } = o;
		return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, strip(v)]));
	}
	return o;
};
const garden = strip(read('maia/content/code/configs/sandbox-4/garden/config.json'));
const out = { 'configs/sandbox-1/assets': assets, 'configs/sandbox-1/garden': garden };
writeFileSync(ROOT + 'play/site/src/lib/content/game/code/configs.json', JSON.stringify(out, null, '\t') + '\n');
console.log(`Sandbox 1: ${Object.keys(assets).length} assets, garden of ${JSON.stringify(garden).match(/"id"/g).length} plantings`);
