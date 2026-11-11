// BUTLER JAMES'S BRAND, ONCE (intent 42a96129; play/SPEC.md §8): a butler's livery, ink ground, ivory paper and one
// brass accent, serif headlines and a quiet sans. A deliberate exception to play's light brand CI: every colour and face
// of Butler James is written here and nowhere else (the intent's check c10 greps for it), as CSS custom properties on a
// page's root (`cssVars`) and as the placeholder scene's materials (`SCENE`), so the CRM page can take them later.

export const BRAND = {
	name: 'Butler James',
	/** the palette: the ground and what stands on it */
	colour: {
		ink: '#0e1520',
		'ink-raised': '#17202e',
		'ink-line': '#2a3546',
		ivory: '#f5f0e6',
		'ivory-dim': '#b9b3a6',
		paper: '#f8f4eb',
		'paper-raised': '#fffdf8',
		'paper-line': '#e2dbcb',
		'on-paper': '#151c27',
		'on-paper-dim': '#5b6370',
		brass: '#c0a062',
		'brass-bright': '#dcc48a',
		'brass-deep': '#8c7038',
		'brass-wash': '#c0a06224',
		shade: '#0e152099'
	},
	font: {
		display: "'Cormorant Variable', 'Iowan Old Style', Georgia, serif",
		text: "'Manrope Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
	},
	radius: { s: '10px', m: '18px', l: '28px' }
} as const;

/** the placeholder apartment's materials and light (./scene/apartment.ts) */
export const SCENE = {
	sky: '#cfe0ee',
	sun: '#fff1d6',
	lamp: '#ffd9a0',
	wall: '#efe9dc',
	floor: '#b08a5e',
	wood: '#6e5438',
	fabric: '#3a5273',
	rug: '#d8cdb8',
	brass: '#c0a062',
	leaf: '#6f9163',
	stone: '#3a4250',
	ground: '#0e1520'
} as const;

/** the brand as CSS custom properties, for a page's root: --bj-ink, --bj-font-display, --bj-radius-m … */
export function cssVars(): string {
	const out: string[] = [];
	for (const [k, v] of Object.entries(BRAND.colour)) out.push(`--bj-${k}:${v}`);
	for (const [k, v] of Object.entries(BRAND.font)) out.push(`--bj-font-${k}:${v}`);
	for (const [k, v] of Object.entries(BRAND.radius)) out.push(`--bj-radius-${k}:${v}`);
	return out.join(';');
}
