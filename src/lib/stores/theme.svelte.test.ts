import { describe, it, expect, beforeEach, vi } from 'vitest';
import { theme, initTheme } from './theme.svelte';

/** Replace the OS preference. `initTheme()` re-reads this each call. */
function stubOS(dark: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: dark,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	}));
}

// The store is a module singleton, so reset its inputs (localStorage + OS) and re-hydrate
// before each test rather than relying on a fresh instance.
beforeEach(() => {
	localStorage.clear();
	stubOS(false);
	initTheme();
});

describe('theme store', () => {
	it('follows a light OS when nothing is stored', () => {
		expect(theme.resolved).toBe('light');
	});

	it('follows a dark OS when nothing is stored', () => {
		stubOS(true);
		initTheme();

		expect(theme.resolved).toBe('dark');
	});

	it('lets an explicit choice override the OS', () => {
		localStorage.setItem('theme', 'light');
		stubOS(true);
		initTheme();

		expect(theme.resolved).toBe('light');
	});

	it('toggles from light to dark and persists the choice', () => {
		theme.toggle();

		expect(theme.resolved).toBe('dark');
		expect(localStorage.getItem('theme')).toBe('dark');
	});

	it('toggles away from the OS preference', () => {
		stubOS(true);
		initTheme();

		theme.toggle();

		expect(theme.resolved).toBe('light');
		expect(localStorage.getItem('theme')).toBe('light');
	});
});
