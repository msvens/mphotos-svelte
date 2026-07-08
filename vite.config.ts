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
		proxy: {
			// Dev only: forward /api (photos, images, thumbs, auth, ...) to the Go backend
			// so session cookies stay same-origin. In prod nginx does this instead.
			'/api': {
				target: 'http://localhost:8050',
				changeOrigin: true
			}
		}
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
