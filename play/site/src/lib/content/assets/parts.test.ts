// The asset viewer's aside: its parts list shows its "Parts N" heading once (intent 119a02d1).
import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Parts from './Parts.svelte';

const catalog = {
	assemblies: [{ id: 'body', label: 'Body' }],
	parts: [
		{ id: 'a', label: 'Frame', assembly: 'body', step: 1 },
		{ id: 'b', label: 'Wheel', assembly: 'body', step: 1, count: 4 }
	],
	steps: ['Build the body']
};

const headings = (html: string) => [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

describe('the asset viewer aside', () => {
	it('the parts heading once', () => {
		const { body } = render(Parts, { props: { catalog } });
		expect(headings(body).filter((h) => /^Parts\b/.test(h))).toEqual(['Parts 2']);
		// the aside adds no heading of its own round the list
		const aside = readFileSync(new URL('../../app/AssetLibrary.svelte', import.meta.url), 'utf8');
		expect(aside.match(/<h[1-6][^>]*>\s*Parts\b/g) ?? []).toEqual([]);
	});
});
