import { render, type SvelteComponentOptions } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { AppState, APP_STATE_KEY } from '$lib/stores/app.svelte';
import { ToastState, TOAST_STATE_KEY } from '$lib/stores/toast.svelte';

/**
 * Render a component that reads `getAppState()` and/or `getToastState()`, injecting
 * controlled stores through Svelte context. Pass pre-configured `state` / `toast`
 * (default: fresh instances) and any component `props`.
 *
 * Both stores are always injected — components deeper in the tree may reach for either,
 * and an unused one costs nothing. The returned `toast` lets tests assert notifications
 * directly (`toast.toasts[0].severity`) without mounting a ToastContainer.
 */
export function renderWithApp<Props extends Record<string, unknown>>(
	component: Component<Props>,
	options: { state?: AppState; toast?: ToastState; props?: Props } = {}
) {
	const state = options.state ?? new AppState();
	const toast = options.toast ?? new ToastState();
	const result = render(component, {
		props: (options.props ?? {}) as Props,
		context: new Map<symbol, unknown>([
			[APP_STATE_KEY, state],
			[TOAST_STATE_KEY, toast]
		])
	} as SvelteComponentOptions<Component<Props>>);
	return { ...result, state, toast };
}
