// EVERY TEXT OF BUTLER JAMES'S LANDING PAGE (intent 42a96129), in German, Sie-form, in one module so one test reads it
// whole (./copy.test.ts). The rule: nothing invented. The page states the offer (./offer.ts: the two flat prices, the
// trailer, the test, the 24 hours, the guarantee: no risk) and nothing else as a fact. Where something is not decided
// or does not exist yet (proof, a bonus, a comparison price, the guarantee's period, the contact, the provider, rights
// and privacy), the text is a `gap`: shown as a marked placeholder ("Platzhalter") for the admin to fill.

import { DELIVERY_HOURS, GUARANTEE_PERCENT, PRICES, TEST, TRAILER_MINUTES, euro } from './offer';

/** a text the page cannot state yet: drawn as a marked placeholder */
export type Gap = { gap: string; text: string };
const gap = (name: string, text: string): Gap => ({ gap: name, text });

const H = `${DELIVERY_HOURS} Stunden`;
const BACK = `${GUARANTEE_PERCENT} % Geld zurück`;
/** the guarantee's name on the page: the customer carries no risk */
const ZERO = 'Null Risiko';
export const VAT = 'zzgl. MwSt.';
export const PLACEHOLDER = 'Platzhalter';

export const COPY = {
	brand: 'Butler James',
	nav: { offer: 'Angebot', steps: 'Ablauf', demos: 'Demos', faq: 'Fragen' },
	cta: 'Jetzt anfragen',
	ctaShort: 'Anfragen',
	ctaNote: `${ZERO}: ${BACK}, ohne Fragen.`,
	// the guarantee in one line, shown wherever a price or a call to action stands
	risk: { name: ZERO, text: `${BACK}, ohne Fragen` },

	hero: {
		eyebrow: 'Begehbare 3D-Welten für Makler und Immobilienunternehmen',
		title: ['Ihre Immobilie.', 'Begehbar.', `In ${H}.`],
		lead: `Butler James baut aus Ihren Fotos und dem Grundriss eine 3D-Welt, durch die Ihre Interessenten online gehen. Zum Festpreis, und ohne Risiko für Sie: ${BACK}, ohne Fragen.`,
		second: `Erst testen: ein Raum für ${euro(TEST.price)}`,
		scroll: 'Scrollen: zusehen, wie sie entsteht',
		promises: [`${ZERO}: ${BACK}`, `Lieferung in ${H} ab Buchung`, 'Festpreis, einmalig']
	},

	// the 3D show's own words: its label, its controls, its rooms
	scene: {
		label: 'Platzhalter-Demo',
		hint: 'Ziehen: drehen · Raum antippen',
		note: 'Diese Wohnung ist ein Platzhalter. Hier steht später eine echte Demo-Immobilie.',
		still: 'Standbild: der Grundriss einer Platzhalter-Wohnung mit fünf Räumen',
		day: 'Tag',
		evening: 'Abend',
		light: 'Licht',
		rooms: { living: 'Wohnen', kitchen: 'Küche', bedroom: 'Schlafen', bath: 'Bad', hall: 'Flur' }
	},

	need: {
		eyebrow: 'Ihr Aufwand',
		title: 'Alles, was wir brauchen:',
		items: ['Fotos aus jedem Raum.', 'Den Grundriss.'],
		punch: 'Das ist alles.',
		text: 'Minimaler Aufwand für Sie: kein Termin vor Ort, kein Scanner, keine Technik. Sie senden die Bilder und den Plan, wir bauen die Welt.',
		photo: 'Foto',
		plan: 'Grundriss'
	},

	build: {
		eyebrow: 'Wir bauen',
		title: 'Aus Ihrem Grundriss wachsen Wände.',
		text: `Aus Plan und Fotos entsteht die begehbare 3D-Welt Ihres Objekts. Geliefert in ${H} ab Buchung.`
	},

	walk: {
		eyebrow: 'Ihre Interessenten',
		title: 'Und dann gehen sie hindurch.',
		text: 'Im Browser, ohne App: auf Smartphone, Tablet und Rechner. Noch vor der ersten Besichtigung.'
	},

	// the offer to try: a demo trailer of one room, from photos uploaded here
	test: {
		eyebrow: 'Zum Testen',
		title: ['Ein Raum.', euro(TEST.price) + '.', `In unter ${TEST.withinHours} Stunde.`],
		lead: `Testen Sie uns mit einem Demo-Trailer eines einzelnen Raums. Sie laden mindestens ${TEST.photos} Fotos des Raums hoch und erhalten den Film in weniger als ${TEST.withinHours} Stunde.`,
		facts: [`${euro(TEST.price)}, einmalig`, 'Ein einzelner Raum', `Mindestens ${TEST.photos} Fotos`, `Lieferung in unter ${TEST.withinHours} Stunde`],
		vat: VAT,
		drop: 'Fotos des Raums wählen',
		dropHint: 'Hierher ziehen oder tippen. JPG, PNG oder HEIC.',
		chosen: 'Fotos gewählt',
		missing: 'Es fehlen noch',
		ready: 'Bereit für den Test',
		clear: 'Auswahl leeren',
		gaps: [gap('upload', 'Upload und Bezahlung sind noch nicht angeschlossen. Ihre Fotos bleiben auf Ihrem Gerät, es wird nichts gesendet.')]
	},

	band: ['Begehbar im Browser', `${H} ab Buchung`, 'Festpreis, einmalig', `${BACK}`, ZERO],

	value: {
		eyebrow: 'Warum es sich rechnet',
		title: 'Vier Dinge, die Sie sicher haben.',
		items: [
			{ name: 'Das Ergebnis', text: 'Ihr Objekt ist online begehbar. Interessenten sehen Räume und Wege, bevor sie einen Termin anfragen.' },
			{ name: ZERO, text: `Gefällt Ihnen das Ergebnis nicht, erhalten Sie ${GUARANTEE_PERCENT} % Ihres Geldes zurück. Ohne Fragen.` },
			{ name: 'Die Zeit', text: `Von der Buchung bis zur Lieferung vergehen ${H}.` },
			{ name: 'Ihr Aufwand', text: 'Sie senden Fotos aus jedem Raum und den Grundriss. Mehr nicht.' }
		]
	},

	offer: {
		eyebrow: 'Das Angebot',
		title: 'Ein Festpreis. Einmalig. Kein Abo.',
		lead: 'Sie wissen vor der Buchung, was es kostet und was Sie bekommen.',
		plans: [
			{ id: 'apartment', kind: '3D-Modell', name: 'Wohnung', price: euro(PRICES.apartment), per: 'einmalig, je Wohnung', vat: VAT, text: 'Die begehbare 3D-Welt Ihrer Wohnung.' },
			{ id: 'house', kind: '3D-Modell', name: 'Haus', price: euro(PRICES.house), per: 'einmalig, je Haus', vat: VAT, text: 'Die begehbare 3D-Welt Ihres Hauses.' },
			{ id: 'trailer', kind: 'Video', name: 'Trailer', price: euro(PRICES.trailer), per: `einmalig, ${TRAILER_MINUTES} Minute Film`, vat: VAT, text: 'Ein Film Ihres Objekts für Exposé und soziale Medien. Einzeln buchbar.' }
		],
		stackTitle: 'Im 3D-Modell enthalten',
		stack: [
			'Die begehbare 3D-Welt Ihres Objekts, im Browser, ohne App',
			'Ein Link für Exposé, Website und E-Mail',
			`Lieferung in ${H} ab Buchung`,
			`${ZERO}: ${BACK}, ohne Fragen`
		],
		gaps: [
			gap('bonus', 'Bonus zum Angebot (vom Anbieter festzulegen)'),
			gap('comparison', 'Vergleichspreis, etwa für Fotograf und Rundgang (vom Anbieter zu belegen)')
		]
	},

	calc: {
		title: 'Ihr Festpreis, ausgerechnet',
		rows: { apartments: '3D-Modell Wohnung', houses: '3D-Modell Haus', trailers: 'Trailer-Video' },
		less: 'weniger',
		more: 'mehr',
		total: 'Ihr Festpreis',
		note: `Einmalig, ${VAT}`,
		empty: 'Wählen Sie Ihre Objekte.'
	},

	guarantee: {
		eyebrow: 'Die Garantie',
		title: `${BACK}. Ohne Fragen.`,
		text: 'Wenn Sie mit Ihrer 3D-Welt nicht zufrieden sind, erhalten Sie den vollen Betrag zurück. Sie müssen nichts begründen.',
		more: 'Das Risiko tragen wir, nicht Sie.',
		zero: ZERO,
		seal: `${GUARANTEE_PERCENT} %`,
		sealNote: 'Geld zurück',
		gaps: [gap('guarantee-terms', 'Frist und genaue Bedingungen der Garantie (vom Anbieter festzulegen)')]
	},

	speed: {
		eyebrow: 'Das Tempo',
		title: `${H} ab Buchung.`,
		text: 'Sie buchen heute. Morgen um dieselbe Zeit ist die 3D-Welt Ihres Objekts geliefert.',
		number: String(DELIVERY_HOURS),
		unit: 'Stunden',
		from: 'Buchung',
		to: 'Lieferung'
	},

	steps: {
		eyebrow: 'Der Ablauf',
		title: 'Vier Schritte bis ins Exposé.',
		items: [
			{ name: 'Buchung', text: `Sie buchen zum Festpreis: das 3D-Modell für ${euro(PRICES.apartment)} je Wohnung und ${euro(PRICES.house)} je Haus, das Trailer-Video für ${euro(PRICES.trailer)}. ${ZERO}: ${BACK}.` },
			{ name: 'Fotos und Grundriss', text: 'Sie senden Fotos aus jedem Raum und den Grundriss. Das ist alles.' },
			{ name: `Lieferung in ${H}`, text: `${H} nach Ihrer Buchung ist die begehbare 3D-Welt fertig.` },
			{ name: 'Live im Exposé', text: 'Sie erhalten einen Link und setzen ihn in Exposé, Website oder E-Mail.' }
		]
	},

	gallery: {
		eyebrow: 'Demo-Immobilien',
		title: 'Hier entstehen die Beispiele.',
		lead: 'Begehbare 3D-Welten und Trailer von Demo-Objekten. Noch sind alle Plätze frei: Wir zeigen nichts, was es nicht gibt.',
		world: '3D-Welt',
		video: 'Video',
		worldNote: 'Hier steht später eine begehbare Demo-Immobilie.',
		videoNote: 'Hier steht später ein Film einer Demo-Immobilie.',
		gaps: [gap('proof', 'Referenzen. Hier steht erst etwas, wenn es echte gibt.')]
	},

	faq: {
		eyebrow: 'Häufige Fragen',
		title: 'Was Makler vorher wissen möchten.',
		open: 'Vom Anbieter zu bestätigen',
		items: [
			{
				id: 'material',
				q: 'Was brauchen Sie von mir?',
				a: ['Fotos aus jedem Raum und den Grundriss des Objekts. Das ist alles.'],
				gaps: []
			},
			{
				id: 'devices',
				q: 'Läuft das auf dem Smartphone und in Immobilienportalen?',
				a: ['Die 3D-Welt läuft im Browser, ohne App: auf Smartphone, Tablet und Rechner. Sie erhalten einen Link, den Sie überall einsetzen können, wo ein Link erlaubt ist.'],
				gaps: [gap('portals', 'Welche Portale die 3D-Welt direkt einbetten (vom Anbieter zu bestätigen)')]
			},
			{
				id: 'ownership',
				q: 'Wem gehört das 3D-Modell?',
				a: [],
				gaps: [gap('rights', 'Nutzungsrechte am 3D-Modell und am Trailer (vom Anbieter festzulegen)')]
			},
			{
				id: 'dislike',
				q: 'Was ist, wenn mir das Ergebnis nicht gefällt?',
				a: [`Dann erhalten Sie ${GUARANTEE_PERCENT} % Ihres Geldes zurück, ohne Fragen. Sie tragen kein Risiko.`],
				gaps: []
			},
			{
				id: 'privacy',
				q: 'Das Zuhause eines Verkäufers ist privat. Wie gehen Sie damit um?',
				a: ['Sie entscheiden, welches Material Sie senden und wo Sie den Link zeigen.'],
				gaps: [gap('privacy', 'Wie Fotos und Modelle gespeichert, geteilt und gelöscht werden (Datenschutzerklärung des Anbieters)')]
			}
		]
	},

	closing: {
		eyebrow: 'Der erste Schritt',
		title: `Ihr Objekt in 3D. ${ZERO}.`,
		text: `Senden Sie uns Fotos und Grundriss eines Objekts. Gefällt Ihnen das Ergebnis nicht, erhalten Sie ${BACK}, ohne Fragen.`,
		gaps: [gap('contact', 'Kontaktweg: E-Mail oder Telefon (vom Anbieter einzutragen)')]
	},

	foot: {
		line: 'Begehbare 3D-Welten für Wohnungen und Häuser.',
		gaps: [gap('provider', 'Anbieter, Impressum und Datenschutz (vor Veröffentlichung einzutragen)')]
	}
} as const;

/** every text of the page with where it stands, and whether it is a gap: what the honesty test reads */
export function texts(node: unknown = COPY, path = ''): { path: string; text: string; gap: boolean }[] {
	if (typeof node === 'string') return [{ path, text: node, gap: false }];
	if (Array.isArray(node)) return node.flatMap((x, i) => texts(x, `${path}[${i}]`));
	if (node && typeof node === 'object') {
		const o = node as Record<string, unknown>;
		if (typeof o.gap === 'string' && typeof o.text === 'string') return [{ path: `${path}<${o.gap}>`, text: o.text, gap: true }];
		return Object.entries(o).flatMap(([k, v]) => (k === 'id' ? [] : texts(v, path ? `${path}.${k}` : k)));
	}
	return [];
}
