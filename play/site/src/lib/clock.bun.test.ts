// The site's Bun tests run at the pinned instant (intent a07e6773; play/avenbox/clock.ts, ../../bunfig.toml).
import { expect, test } from 'bun:test';
import { PINNED } from '../../../avenbox/clock';

test('this suite runs at the pinned instant', () => {
	expect(Date.now()).toBe(PINNED);
});
