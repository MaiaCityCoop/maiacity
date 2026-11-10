/*
 * cards.ts's check (intent 0c095468): a card is laid beside the params its recipe declares, and every way it can say
 * less is found. Vitest's (the census's other checks are bun's).
 *
 *   cd play/site && bunx vitest run scripts/census -t 'a card that declares less than its recipe'
 */
import { describe, expect, it } from 'vitest';
import { differences, type Param } from './cards';

/** a plant's params as its recipe declares them: stage 0–12, seed, detail, the view */
const RECIPE: Param[] = [
	{ id: 'stage', label: 'Stage', type: 'number', min: 0, max: 12, value: 9, names: Array.from({ length: 13 }, (_, i) => `S${i}`) },
	{ id: 'seed', label: 'Seed', type: 'string', value: 'maia', maxLength: 40 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.05, value: 1 },
	{ id: 'fruit', label: 'View', type: 'integer', min: 0, max: 1, value: 0, names: ['Plant', 'Fruit'] }
];
const copy = (): Param[] => JSON.parse(JSON.stringify(RECIPE));

describe('cards.ts: a card against its recipe', () => {
	it('a card that declares less than its recipe: a narrower range, no params at all, a parameter left out', () => {
		// the range of an older version kept on the card (hazel v4's said 0–9; its recipe takes 0–12)
		const narrow = copy();
		narrow[0] = { ...narrow[0], max: 9, names: narrow[0].names!.slice(0, 10) };
		expect(differences(RECIPE, narrow)).toEqual(['stage.max: the recipe says 12, the card 9', 'stage.names: the recipe says 13 names, the card 10 names']);

		// a card with no params (moringa v2's), and one that leaves the view out
		expect(differences(RECIPE, undefined)).toHaveLength(4);
		expect(differences(RECIPE, [])).toContain('stage: the recipe takes it, the card does not declare it');
		expect(differences(RECIPE, copy().slice(0, 3))).toEqual(['fruit: the recipe takes it, the card does not declare it']);
	});

	it('a card that says what its recipe takes has no difference; one that says more, or another order, does', () => {
		expect(differences(RECIPE, copy())).toEqual([]);
		expect(differences([], [])).toEqual([]);
		expect(differences(RECIPE, [...copy(), { id: 'age', type: 'number', value: 1 }])).toEqual(['age: the card declares it, the recipe does not take it']);
		const turned = copy();
		turned.reverse();
		expect(differences(RECIPE, turned)).toEqual(['order: the recipe takes stage, seed, detail, fruit, the card says fruit, detail, seed, stage']);
		const later = copy();
		later[0].value = 12;
		expect(differences(RECIPE, later)).toEqual(['stage.value: the recipe says 9, the card 12']);
	});
});
