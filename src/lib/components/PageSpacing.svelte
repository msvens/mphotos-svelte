<script lang="ts">
	import { getAppState } from '$lib/stores/app.svelte';

	interface PageSpacingProps {
		// 'default' (96px), 'no_spacing' (navbar height), or any CSS length.
		height?: 'default' | 'no_spacing' | string;
		class?: string;
	}

	let { height = 'default', class: cls = '' }: PageSpacingProps = $props();

	const app = getAppState();

	let navbarHeight = $derived(app.uxConfig.denseTopBar ? '40px' : '48px'); // h-10 vs h-12
	let resolved = $derived(
		height === 'default' ? '96px' : height === 'no_spacing' ? navbarHeight : height
	);
</script>

<div style="height: {resolved}" class={cls}></div>
