import adapter from '@sveltejs/adapter-static';

/** the website: maia.city, prerendered, every page its own folder (Caddy serves the build from the server's site/current) */
export default {
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		prerender: { handleHttpError: 'fail' }
	}
};
