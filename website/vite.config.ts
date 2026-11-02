import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// the website's build: plain SvelteKit, nothing from beside this folder (README.md)
export default defineConfig({
	// the website's own tsconfig, also for virtual modules (never one looked up beside it)
	tsconfig: './tsconfig.json',
	plugins: [sveltekit()]
} as never);
