/**
 * Per-visitor light/dark theme. A module singleton (global client state) rather than a
 * context store, so the pre-paint `app.html` script and the app read the same source.
 *
 * `stored` is the visitor's *explicit* choice; `null` means "follow the OS", which is the
 * default and tracks `prefers-color-scheme` live. The layout applies `theme.resolved` to the
 * `.dark` class on `<html>`.
 */
type Theme = 'light' | 'dark';

const KEY = 'theme';

let stored = $state<Theme | null>(null);
let osDark = $state(false);
let listenerAdded = false;

function readStored(): Theme | null {
	try {
		const v = localStorage.getItem(KEY);
		return v === 'light' || v === 'dark' ? v : null;
	} catch {
		return null;
	}
}

function resolvedTheme(): Theme {
	return stored ?? (osDark ? 'dark' : 'light');
}

export const theme = {
	/** The theme to apply right now: the explicit choice, or the OS preference. */
	get resolved(): Theme {
		return resolvedTheme();
	},
	/** Flip to the opposite of the current theme and persist it as an explicit choice. */
	toggle() {
		stored = resolvedTheme() === 'dark' ? 'light' : 'dark';
		try {
			localStorage.setItem(KEY, stored);
		} catch {
			// Storage can be unavailable (private mode); the choice just won't persist.
		}
	}
};

/**
 * Hydrate from localStorage + the OS setting, and follow OS changes while no explicit choice
 * is stored. Call once on mount; safe to call again (only the OS listener is guarded).
 */
export function initTheme(): void {
	if (typeof window === 'undefined') return;
	stored = readStored();
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	osDark = mq.matches;
	if (!listenerAdded) {
		mq.addEventListener('change', (e) => (osDark = e.matches));
		listenerAdded = true;
	}
}
