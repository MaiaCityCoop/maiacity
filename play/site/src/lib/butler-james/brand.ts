// BUTLER JAMES'S BRAND, ONCE (intent 42a96129; play/SPEC.md §8): a very dark blue ground, bone white and one electric lime; a large
// expressive grotesque for headlines and the wordmark, a quiet sans for text. A deliberate exception to play's light
// brand CI: every colour and face of Butler James is written here and nowhere else (the intent's check c10 greps for
// it), as CSS custom properties on a page's root (`cssVars`) and as the 3D show's materials and light (`SCENE`), so
// the CRM page can take them later.

export const BRAND = {
	name: 'Butler James',
	/** the palette: the ground, what stands on it, and the one accent */
	colour: {
		ink: '#040a1f',
		'ink-raised': '#0a1330',
		'ink-high': '#111d47',
		'ink-line': '#1f2d5c',
		bone: '#f4f2ea',
		'bone-dim': '#a4acc6',
		paper: '#f4f2ea',
		'paper-raised': '#ffffff',
		'paper-line': '#d9d6cb',
		'on-paper': '#050b22',
		'on-paper-dim': '#525a78',
		accent: '#d4ff3a',
		'accent-bright': '#e6ff86',
		'accent-deep': '#5f7a00',
		'on-accent': '#0a0d02',
		'accent-wash': '#d4ff3a1c',
		'accent-glow': '#d4ff3a55',
		shade: '#040a1fb8',
		veil: '#040a1f00'
	},
	font: {
		display: "'Bricolage Grotesque Variable', 'Arial Narrow', system-ui, sans-serif",
		text: "'Manrope Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
	},
	radius: { s: '10px', m: '20px', l: '32px' }
} as const;

/** the 3D show's materials and its light, by day and in the evening (./scene/apartment.ts) */
export const SCENE = {
	wall: '#eeebe2',
	floor: '#c8ad86',
	tile: '#aeb4bb',
	wood: '#7b5d3d',
	fabric: '#39414f',
	soft: '#e4dfd2',
	leaf: '#6f9a5f',
	stone: '#4a4f58',
	accent: '#d4ff3a',
	lamp: '#ffcf8a',
	day: { sun: '#fff1da', sky: '#e6edf5', ground: '#b9b2a4' },
	evening: { sun: '#5b6fb0', sky: '#27345e', ground: '#0c1430' }
} as const;

/** the brand as CSS custom properties, for a page's root: --bj-ink, --bj-font-display, --bj-radius-m … */
export function cssVars(): string {
	const out: string[] = [];
	for (const [k, v] of Object.entries(BRAND.colour)) out.push(`--bj-${k}:${v}`);
	for (const [k, v] of Object.entries(BRAND.font)) out.push(`--bj-font-${k}:${v}`);
	for (const [k, v] of Object.entries(BRAND.radius)) out.push(`--bj-radius-${k}:${v}`);
	return out.join(';');
}
