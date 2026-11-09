import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// in development the API runs beside the dev server (play/api: PORT=3911 bun src/index.ts)
export default defineConfig({
	// the site's own tsconfig, also for virtual modules (otherwise looked up from the repo's root)
	tsconfig: './tsconfig.json',
	plugins: [sveltekit()],
	server: { proxy: { '/api': process.env.PLAY_API || 'http://localhost:3911' } },
	// (the census's own checks are bun's, `bun test scripts/census`, but for cards.ts's, which are vitest's: intent 0c095468)
	test: { include: ['src/**/*.test.{ts,js}', 'scripts/census/cards.test.ts'], environment: 'node' }
});
