import adapter from '@sveltejs/adapter-static';

/** play's site: a static build Caddy serves at play.maia.city, every page rendered in the browser */
export default {
	kit: {
		adapter: adapter({ fallback: '200.html' }),
		// what play's API answers, its own types (play/api/src/wire.ts), imported as types only; an intent's stages
		// (play/api/src/kit/stages.ts), values that import nothing
		alias: { $wire: '../api/src/wire.ts', $stages: '../api/src/kit/stages.ts' },
		// a page open from before a deploy notices the new build (the layout then reloads it: on the next navigation,
		// or when the tab comes back into view), so an iPad never keeps running yesterday's code
		version: { pollInterval: 5 * 60_000 }
	}
};
