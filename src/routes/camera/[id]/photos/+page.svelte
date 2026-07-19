<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { camerasService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import type { Camera } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import PhotoGrid from '$lib/components/photo/PhotoGrid.svelte';

	const app = getAppState();
	const photoState = getPhotoState();

	let cameras = $state<Camera[]>([]);
	let camerasLoading = $state(true);

	onMount(async () => {
		try {
			cameras = await camerasService.getCameras();
		} catch (e) {
			console.error('Error fetching cameras:', e);
		} finally {
			camerasLoading = false;
		}
	});

	// Reuse the site's photo lists (owner → all, guest → photostream album, so private albums
	// stay out) and filter to this camera's model — the same client-side filter the React app does.
	$effect(() => {
		if (app.loading) return;
		void photoState.load(app.isUser, app.uxConfig.photoStreamAlbumId);
	});

	let camera = $derived(cameras.find((c) => c.id === page.params.id) ?? null);
	let photos = $derived(
		camera ? photoState.photos.filter((p) => p.cameraModel === camera.model) : []
	);
</script>

<PageSpacing />

{#if camerasLoading || app.loading || photoState.loading}
	<div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
		<div class="animate-pulse text-gray-400">Loading...</div>
	</div>
{:else if !camera}
	<div class="py-12 text-center text-gray-400">Camera not found</div>
{:else}
	<div class="mx-auto max-w-[1024px]">
		<h1 class="mb-6 text-2xl font-light">{camera.model} Photos</h1>
		{#if photos.length === 0}
			<div class="py-12 text-center text-gray-400">No photos found for this camera</div>
		{:else}
			<PhotoGrid
				{photos}
				columns={app.uxConfig.photoGridCols}
				spacing={app.uxConfig.photoGridSpacing}
				linkTo="/photo"
			/>
		{/if}
	</div>
{/if}
