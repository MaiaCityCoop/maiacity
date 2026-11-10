// play/site's vitest run for intent 5884ade4's c11 (./site-checks.sh): the site's own config (play/site/vite.config.ts),
// on every core, its slowest files started first, a test given 60 s (Sandbox 7's globe takes 7 s in vitest; its 5 s
// were written for bun). Sandbox 2's structural tests take most of the run (one alone 290 s here); in the order vitest
// picks with no results cached they finish one after another past the box's 600 s a check.
// Nothing imported by name from here but the site's config: bare names resolve beside this file, where nothing is.
import { availableParallelism } from 'node:os';
import site from '../../play/site/vite.config.ts';

/** slowest first, as measured here (seconds): the rest after them, as vitest orders them */
const SLOW = [
	'src/lib/sandbox-2/tests/telescopic-shoring.test.ts', // 292
	'src/lib/sandbox-2/tests/dome-size.test.ts', // 256
	'src/lib/sandbox-2/tests/compact-shoring.test.ts', // 208
	'src/lib/sandbox-2/tests/new-buildings.test.ts', // 178
	'src/lib/sandbox-2/tests/dome-staged-size.test.ts', // 143
	'src/lib/sandbox-2/tests/industrial-hall.test.ts', // 72
	'src/lib/sandbox-2/tests/shed.test.ts', // 57
	'src/lib/sandbox-2/tests/german-house.test.ts', // 42
	'src/lib/sandbox-2/tests/brick-house.test.ts', // 26
	'src/lib/sandbox-2/tests/roof-failure.test.ts', // 25
	'src/lib/sandbox-2/tests/compact-dome-wind.test.ts' // 22
];

type Spec = { moduleId: string };
const rank = (f: Spec) => {
	const i = SLOW.findIndex((s) => f.moduleId.endsWith(`/play/site/${s}`));
	return i < 0 ? SLOW.length : i;
};

/** vitest's sequencer: no sharding, the slow files first and the rest by path */
class SlowestFirst {
	async shard(files: Spec[]) {
		return files;
	}
	async sort(files: Spec[]) {
		return [...files].sort((a, b) => rank(a) - rank(b) || a.moduleId.localeCompare(b.moduleId));
	}
}

export default { ...site, test: { ...site.test, maxWorkers: availableParallelism(), testTimeout: 60_000, sequence: { sequencer: SlowestFirst } } };
