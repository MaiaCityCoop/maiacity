import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// in development the API runs beside the dev server (play/api: PORT=3911 bun src/index.ts)
export default defineConfig({
	// the site's own tsconfig, also for virtual modules (otherwise looked up from the repo's root)
	tsconfig: './tsconfig.json',
	plugins: [sveltekit()],
	server: { proxy: { '/api': process.env.PLAY_API || 'http://localhost:3911' } },
	// a *.bun.test.ts needs Bun's runtime (its Worker): `bun run test` runs those with Bun after vitest's
	test: { include: ['src/**/*.test.{ts,js}'], exclude: ['**/node_modules/**', 'src/**/*.bun.test.ts'], environment: 'node' }
});
