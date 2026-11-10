// vitest's suite runs at the pinned instant (intent a07e6773; play/avenbox/clock.ts, ../../vitest.clock.ts).
import { expect, test, vi } from 'vitest';
import { PINNED } from '../../../avenbox/clock';

test('this suite runs at the pinned instant, and Date stands still while time passes', async () => {
	const t = performance.now();
	expect(Date.now()).toBe(PINNED);
	await new Promise((r) => setTimeout(r, 5));
	expect(new Date().toISOString()).toBe('2100-01-01T12:00:00.000Z');
	expect(performance.now()).toBeGreaterThan(t);
	// a test that needs another time sets it …
	vi.setSystemTime(new Date('2026-11-10T09:20:00Z'));
	expect(Date.now()).toBe(Date.parse('2026-11-10T09:20:00Z'));
});
test('… and the next test starts pinned again', () => {
	expect(Date.now()).toBe(PINNED);
});
