// The gallery's slots (intent 42a96129, check c4): placeholders today, a world by its UUID or a video by its hash later.
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { SLOTS, isPlaceholder, slot } from './slots';
import Gallery from './Gallery.svelte';

const UUID = '0b6f2c1e-5f3a-4b7e-9a51-2d4c8e1f7a90';
const HASH = 'a'.repeat(64);

describe("the gallery's slots", () => {
	it('are at least eight, worlds and videos, none filled yet', () => {
		expect(SLOTS.length).toBeGreaterThanOrEqual(8);
		expect(SLOTS.some((s) => s.kind === 'world')).toBe(true);
		expect(SLOTS.some((s) => s.kind === 'video')).toBe(true);
		for (const s of SLOTS) expect(isPlaceholder(s)).toBe(true);
	});
	it('take a world by its UUID and a video by its hash', () => {
		expect(slot('world', UUID)).toEqual({ kind: 'world', ref: UUID });
		expect(slot('video', HASH)).toEqual({ kind: 'video', ref: HASH });
		expect(isPlaceholder(slot('world', UUID))).toBe(false);
	});
	it('refuse a title, a path, a slug, or the other kind\'s reference', () => {
		for (const ref of ['Villa am See', '/demos/villa.mp4', 'villa-am-see', 'https://example.com/a', '', UUID.toUpperCase()]) {
			expect(() => slot('world', ref)).toThrow();
			expect(() => slot('video', ref)).toThrow();
		}
		expect(() => slot('world', HASH)).toThrow();
		expect(() => slot('video', UUID)).toThrow();
		expect(() => slot('photo')).toThrow();
	});
	it('draws every empty slot as a marked placeholder', () => {
		const html = render(Gallery).body;
		const marked = html.match(/data-slot="(world|video)" data-placeholder="true"/g) ?? [];
		expect(marked.length).toBe(SLOTS.length);
		expect((html.match(/Platzhalter/g) ?? []).length).toBeGreaterThanOrEqual(SLOTS.length);
	});
});
