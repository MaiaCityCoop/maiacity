// EVERY TEXT OF BUTLER JAMES'S LANDING PAGE (intent 42a96129), in German, Sie-form, in one module so one test reads it
// whole (./copy.test.ts). The rule: nothing invented. The page states the offer (./offer.ts: the two flat prices, the
// add-on, the 24 hours, the guarantee, the free demo first) and nothing else as a fact. Where something is not decided
// or does not exist yet (proof, a bonus, a comparison price, the guarantee's period, the contact, the provider, rights
// and privacy), the text is a `gap`: shown as a marked placeholder ("Platzhalter") for the admin to fill.

import { DELIVERY_HOURS, GUARANTEE_PERCENT, PRICES, euro } from './offer';

/** a text the page cannot state yet: drawn as a marked placeholder */
export type Gap = { gap: string; text: string };
const gap = (name: string, text: string): Gap => ({ gap: name, text });

const H = `${DELIVERY_HOURS} Stunden`;
const BACK = `${GUARANTEE_PERCENT} % Geld zurück`;
export const VAT = 'zzgl. MwSt.';
export const PLACEHOLDER = 'Platzhalter';

export const COPY = {
	brand: 'Butler James',
	nav: { offer: 'Angebot', steps: 'Ablauf', demos: 'Demos', faq: 'Fragen' },
	cta: 'Kostenlose Demo anfragen',
	ctaShort: 'Demo anfragen',
	ctaNote: 'Kostenlos und unverbindlich. Sie zahlen erst, wenn Sie buchen.',

	hero: {
		eyebrow: 'Begehbare 3D-Welten für Makler und Immobilienunternehmen',
		title: ['Ihre Immobilie.', 'Begehbar.', `In ${H}.`],
		lead: `Butler James baut aus Ihren Fotos und dem Grundriss eine 3D-Welt, durch die Ihre Interessenten online gehen. Zum Festpreis. Die erste Demo Ihres eigenen Objekts erhalten Sie kostenlos, bevor Sie etwas bezahlen.`,
		second: 'Preise ansehen',
		scroll: 'Scrollen: zusehen, wie sie entsteht',
		promises: ['Demo Ihres Objekts vorab, kostenlos', `Lieferung in ${H} ab Buchung`, `${BACK}, ohne Fragen`]
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

	band: ['Begehbar im Browser', `${H} ab Buchung`, 'Festpreis, einmalig', `${BACK}`, 'Demo vorab, kostenlos'],

	value: {
		eyebrow: 'Warum es sich rechnet',
		title: 'Vier Dinge, die Sie sicher haben.',
		items: [
			{ name: 'Das Ergebnis', text: 'Ihr Objekt ist online begehbar. Interessenten sehen Räume und Wege, bevor sie einen Termin anfragen.' },
			{ name: 'Die Sicherheit', text: 'Sie sehen eine Demo Ihres eigenen Objekts, bevor Sie buchen. Kostenlos.' },
			{ name: 'Die Zeit', text: `Von der Buchung bis zur Lieferung vergehen ${H}.` },
			{ name: 'Ihr Aufwand', text: 'Sie senden Fotos aus jedem Raum und den Grundriss. Mehr nicht.' }
		]
	},

	offer: {
		eyebrow: 'Das Angebot',
		title: 'Ein Festpreis. Einmalig. Kein Abo.',
		lead: 'Sie wissen vor der Buchung, was es kostet und was Sie bekommen.',
		plans: [
			{ id: 'apartment', name: 'Wohnung', price: euro(PRICES.apartment), per: 'einmalig, je Wohnung', vat: VAT },
			{ id: 'house', name: 'Haus', price: euro(PRICES.house), per: 'einmalig, je Haus', vat: VAT }
		],
		stackTitle: 'In jedem Festpreis enthalten',
		stack: [
			'Die begehbare 3D-Welt Ihres Objekts, im Browser, ohne App',
			'Ein Link für Exposé, Website und E-Mail',
			`Lieferung in ${H} ab Buchung`,
			`${BACK}, ohne Fragen`,
			'Die kostenlose Demo Ihres Objekts vor der Buchung'
		],
		addon: {
			tag: 'Add-on',
			name: 'Cinematic Trailer',
			price: euro(PRICES.trailer),
			per: 'einmalig, je Trailer',
			vat: VAT,
			text: 'Ein kurzer Film durch die 3D-Welt Ihres Objekts, für Exposé und soziale Medien.'
		},
		gaps: [
			gap('bonus', 'Bonus zum Angebot (vom Anbieter festzulegen)'),
			gap('comparison', 'Vergleichspreis, etwa für Fotograf und Rundgang (vom Anbieter zu belegen)')
		]
	},

	calc: {
		title: 'Ihr Festpreis, ausgerechnet',
		rows: { apartments: 'Wohnungen', houses: 'Häuser', trailers: 'Cinematic Trailer' },
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
		more: 'Und weil Sie die Demo Ihres eigenen Objekts sehen, bevor Sie buchen, wissen Sie vorher, was Sie bekommen.',
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
			{ name: 'Kostenlose Demo', text: 'Sie senden Fotos aus jedem Raum und den Grundriss eines Objekts. Wir bauen daraus eine erste 3D-Demo. Kostenlos und unverbindlich.' },
			{ name: 'Buchung', text: `Gefällt Ihnen die Demo, buchen Sie zum Festpreis: ${euro(PRICES.apartment)} je Wohnung, ${euro(PRICES.house)} je Haus.` },
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
				a: [`Dann erhalten Sie ${GUARANTEE_PERCENT} % Ihres Geldes zurück, ohne Fragen. Die erste Demo sehen Sie ohnehin, bevor Sie buchen.`],
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
		title: 'Sehen Sie zuerst Ihr eigenes Objekt in 3D.',
		text: 'Senden Sie uns Fotos und Grundriss eines Objekts. Die Demo ist kostenlos, und Sie entscheiden danach.',
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
