// The page's texts invent nothing (intent 42a96129, check c3): read whole from ./copy.ts.
import { describe, expect, it } from 'vitest';
import { COPY, VAT, texts } from './copy';
import { PRICES, TEST, euro } from './offer';

const all = texts();
const said = all.filter((t) => !t.gap);

describe("the landing page's texts", () => {
	it('are found', () => {
		expect(all.length).toBeGreaterThan(80);
	});
	it('claim no proof that does not exist, and no scarcity', () => {
		const forbidden = [
			/kundenstimme/i, /bewertung/i, /\bsterne?\b/i, /★|⭐/, /zufriedene\s+kunden/i, /testimonial/i, /rezension/i,
			/nur\s+noch/i, /nur\s+heute/i, /countdown/i, /letzte\s+plätze/i, /begrenzt/i, /solange\s+der\s+vorrat/i,
			/über\s+\d+\s+(makler|kunden|objekte)/i, /\d+\s*(makler|kunden)\b/i, /marktführer/i, /nr\.\s*1/i, /garantiert\s+mehr/i
		];
		for (const t of all) for (const f of forbidden) expect(f.test(t.text), `${t.path}: "${t.text}" matches ${f}`).toBe(false);
	});
	it("state no amount but the offer's three, and no percentage but the guarantee's", () => {
		const amounts = new Set([...Object.values(PRICES), TEST.price].map(euro));
		for (const t of all) {
			for (const m of t.text.matchAll(/\d[\d.]*\s*€|€\s*\d[\d.]*/g)) expect(amounts.has(m[0]), `${t.path}: ${m[0]}`).toBe(true);
			for (const m of t.text.matchAll(/(\d+)\s*%/g)) expect(m[1], `${t.path}: ${m[0]}`).toBe('100');
			// no number at all but the prices, the 24 hours, the 100 %, the test's 6 photos and 1 hour, the trailer's 1 minute
			// (and the 3 of 3D)
			for (const m of t.text.matchAll(/\d[\d.]*/g)) expect(['685', '1.249', '479', '99', '24', '100', '3', '1', '6'].includes(m[0]), `${t.path}: the number ${m[0]}`).toBe(true);
		}
	});
	it('address the reader as Sie', () => {
		for (const t of all) expect(/\b(du|dich|dir|dein\w*|euch|euer\w*|eure\w*)\b/i.test(t.text), `${t.path}: "${t.text}"`).toBe(false);
		expect(said.some((t) => /\bSie\b/.test(t.text))).toBe(true);
	});
	it('mark every gap as a placeholder for the admin', () => {
		const gaps = all.filter((t) => t.gap).map((t) => t.path.match(/<(.+)>$/)![1]);
		for (const g of ['proof', 'bonus', 'comparison', 'guarantee-terms', 'contact', 'provider', 'rights', 'privacy', 'portals', 'upload']) expect(gaps, g).toContain(g);
	});
	it('show each price net', () => {
		expect(VAT).toBe('zzgl. MwSt.');
		for (const p of COPY.offer.plans) expect(p.vat).toBe(VAT);
		expect(COPY.test.vat).toBe(VAT);
		expect(COPY.calc.note).toContain(VAT);
	});
	it('answer the five objections and name the four steps', () => {
		expect(COPY.faq.items.map((i) => i.id)).toEqual(['material', 'devices', 'ownership', 'dislike', 'privacy']);
		for (const i of COPY.faq.items) expect(i.a.length + i.gaps.length, i.id).toBeGreaterThan(0);
		expect(COPY.steps.items.length).toBe(4);
		expect(COPY.steps.items.map((s) => s.name)).toEqual(['Kostenlose Demo', 'Buchung', 'Lieferung in 24 Stunden', 'Live im Exposé']);
	});
	it('offer the trailer as a product of its own, and the test of one room', () => {
		expect(COPY.offer.plans.map((p) => p.id)).toEqual(['apartment', 'house', 'trailer']);
		expect(COPY.offer.plans.map((p) => p.price)).toEqual(['685 €', '1.249 €', '479 €']);
		for (const t of all) expect(/add-?on|zusatz/i.test(t.text), `${t.path}: "${t.text}"`).toBe(false);
		const test = texts(COPY.test).map((t) => t.text).join(' ');
		for (const said of ['99 €', 'einzelnen Raums', 'mindestens 6 Fotos', 'weniger als 1 Stunde', 'es wird nichts gesendet']) expect(test).toContain(said);
	});
	it('ask for photos of every room and the floor plan, and nothing else', () => {
		const need = texts(COPY.need).map((t) => t.text).join(' ');
		for (const said of ['Fotos aus jedem Raum', 'Grundriss', 'Das ist alles', 'Minimaler Aufwand für Sie']) expect(need).toContain(said);
		// the first round asked for a listing's link: no text does any more
		for (const t of all) expect(/Inserat|Link zu (Ihrem|einem)/i.test(t.text), `${t.path}: "${t.text}"`).toBe(false);
	});
});
