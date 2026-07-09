import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA: single fallback page, all routing/rendering happens client-side.
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	server: {
		// Match mphotos-ui: the frontend dev server runs on 3000 and is reached
		// through the nginx reverse proxy (localhost:8060), which routes / here and
		// /api to the Go backend. No app-level /api proxy — dev mirrors production,
		// so there is a single request path and no host/header divergence to surprise us.
		port: 3000,
		strictPort: true
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
