import { render, type SvelteComponentOptions } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { AppState, APP_STATE_KEY } from '$lib/stores/app.svelte';

/**
 * Render a component that reads `getAppState()`, injecting a controlled AppState
 * through Svelte context. Pass a pre-configured `state` (default: a fresh AppState)
 * and any component `props`.
 */
export function renderWithApp<Props extends Record<string, unknown>>(
	component: Component<Props>,
	options: { state?: AppState; props?: Props } = {}
) {
	const state = options.state ?? new AppState();
	const result = render(component, {
		props: (options.props ?? {}) as Props,
		context: new Map([[APP_STATE_KEY, state]])
	} as SvelteComponentOptions<Component<Props>>);
	return { ...result, state };
}
