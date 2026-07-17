<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setAppState } from '$lib/stores/app.svelte';
	import { setToastState } from '$lib/stores/toast.svelte';
	import { setPhotoState } from '$lib/stores/photos.svelte';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import ToastContainer from '$lib/components/ui/toast/ToastContainer.svelte';

	let { children } = $props();

	const app = setAppState();
	setToastState();
	setPhotoState();

	onMount(() => app.init());

	// Apply the theme derived from UX config to <html> (Tailwind class-based dark mode).
	$effect(() => {
		document.documentElement.classList.toggle('dark', app.uxConfig.colorTheme === 'dark');
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col">
	<Navbar />
	<div class="flex-grow">
		<main class="mx-auto w-full px-4">
			{@render children()}
		</main>
	</div>
	<Footer />
</div>

<ToastContainer />
