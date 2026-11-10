import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// in development the API runs beside the dev server (play/api: PORT=3911 bun src/index.ts)
export default defineConfig({
	// the site's own tsconfig, also for virtual modules (otherwise looked up from the repo's root)
	tsconfig: './tsconfig.json',
	plugins: [sveltekit()],
	server: { proxy: { '/api': process.env.PLAY_API || 'http://localhost:3911' } },
	// a *.bun.test.ts needs Bun's runtime (its Worker): `bun run test` runs those with Bun after vitest's. Sandbox 7's
	// fixture.test.ts holds no test, only the planet its tests share (named .test.ts so the image's build leaves it out).
	// The census's own checks are bun's (`bun test scripts/census`), but for cards.ts's, which are vitest's (intent 0c095468)
	test: {
		include: ['src/**/*.test.{ts,js}', 'scripts/census/cards.test.ts'],
		exclude: ['**/node_modules/**', 'src/**/*.bun.test.ts', 'src/lib/content/sandbox-7/fixture.test.ts'],
		environment: 'node',
		// every test at the pinned clock (play/avenbox/clock.ts)
		setupFiles: ['./vitest.clock.ts'],
		// in CI the suite runs beside the API's tests, at the lowest priority: a test of a few seconds alone needs room
		testTimeout: 30_000
	}
});
