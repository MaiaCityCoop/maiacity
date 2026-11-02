import adapter from '@sveltejs/adapter-static';

/** play's site: a static build Caddy serves at play.maia.city, every page rendered in the browser */
export default {
	kit: {
		adapter: adapter({ fallback: '200.html' })
	}
};
