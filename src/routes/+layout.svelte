<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setAppState } from '$lib/stores/app.svelte';

	let { children } = $props();

	const app = setAppState();

	onMount(() => app.init());

	// Apply the theme derived from UX config to <html> (Tailwind class-based dark mode).
	$effect(() => {
		document.documentElement.classList.toggle('dark', app.uxConfig.colorTheme === 'dark');
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
