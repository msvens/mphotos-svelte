import { describe, it, expect, afterEach, vi } from 'vitest';
import { createViewport } from './viewport.svelte';
import { setViewport } from './test-utils';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('createViewport', () => {
	it('defaults to desktop landscape', () => {
		const viewport = createViewport();
		expect(viewport.isMobile).toBe(false);
		expect(viewport.isPortrait).toBe(false);
	});

	it('reports mobile on the very first read', () => {
		// The whole point: matchMedia is synchronous, so there's no post-mount correction
		// and therefore no desktop image fetched before the crop.
		setViewport({ mobile: true });

		expect(createViewport().isMobile).toBe(true);
	});

	it('reports portrait independently of mobile', () => {
		setViewport({ mobile: false, portrait: true });

		const viewport = createViewport();
		expect(viewport.isMobile).toBe(false);
		expect(viewport.isPortrait).toBe(true);
	});

	it('reports a portrait phone', () => {
		setViewport({ mobile: true, portrait: true });

		const viewport = createViewport();
		expect(viewport.isMobile).toBe(true);
		expect(viewport.isPortrait).toBe(true);
	});

	it('queries Tailwind’s sm breakpoint', () => {
		const queries: string[] = [];
		vi.stubGlobal('matchMedia', (query: string) => {
			queries.push(query);
			return {
				matches: false,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false
			};
		});

		createViewport();

		expect(queries).toContain('(max-width: 639.98px)');
		expect(queries).toContain('(orientation: portrait)');
	});
});
