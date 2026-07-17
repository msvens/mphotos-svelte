import { render, type SvelteComponentOptions } from '@testing-library/svelte';
import { vi } from 'vitest';
import type { Component } from 'svelte';
import { AppState, APP_STATE_KEY } from '$lib/stores/app.svelte';
import { ToastState, TOAST_STATE_KEY } from '$lib/stores/toast.svelte';
import { PhotoState, PHOTO_STATE_KEY } from '$lib/stores/photos.svelte';

/**
 * Pretend the viewport is a phone and/or in portrait. Call **before** `render` —
 * `MediaQuery` reads `matchMedia` when it's constructed, which is at mount.
 *
 * `setupTests.ts` installs a stub that matches nothing (desktop, landscape); this
 * replaces it for one test.
 */
export function setViewport({ mobile = false, portrait = false } = {}) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('orientation: portrait') ? portrait : mobile,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	}));
}

/**
 * Render a component that reads any of the app stores, injecting controlled instances
 * through Svelte context. Pass pre-configured `state` / `toast` / `photos` (default:
 * fresh instances) and any component `props`.
 *
 * All stores are always injected — components deeper in the tree may reach for any of
 * them, and an unused one costs nothing. The returned stores let tests assert directly
 * (`toast.toasts[0].severity`, `photos.streamIds`) without mounting anything extra.
 */
export function renderWithApp<Props extends Record<string, unknown>>(
	component: Component<Props>,
	options: { state?: AppState; toast?: ToastState; photos?: PhotoState; props?: Props } = {}
) {
	const state = options.state ?? new AppState();
	const toast = options.toast ?? new ToastState();
	const photos = options.photos ?? new PhotoState();
	const result = render(component, {
		props: (options.props ?? {}) as Props,
		context: new Map<symbol, unknown>([
			[APP_STATE_KEY, state],
			[TOAST_STATE_KEY, toast],
			[PHOTO_STATE_KEY, photos]
		])
	} as SvelteComponentOptions<Component<Props>>);
	return { ...result, state, toast, photos };
}
