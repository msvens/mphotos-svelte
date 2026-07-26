<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { camerasService, photosService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import type { Camera, PhotoMetadata } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import PhotoGrid from '$lib/components/photo/PhotoGrid.svelte';

	const app = getAppState();

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

	let camera = $derived(cameras.find((c) => c.id === page.params.id) ?? null);

	// Filtering is server-side: `GET /api/photos?cameraModel=` is session-aware (owner → all
	// matches, guest → matches within the photostream), so no client-side filter or isUser branch.
	let photos = $state<PhotoMetadata[]>([]);
	let photosLoading = $state(true);

	$effect(() => {
		const model = camera?.model;
		if (!model) return;
		let cancelled = false;
		photosLoading = true;
		(async () => {
			const result = await photosService.getPhotosByCameraModel(model);
			if (cancelled) return;
			photos = result.photos;
			photosLoading = false;
		})();
		return () => (cancelled = true);
	});
</script>

<PageSpacing />

{#if camerasLoading || (camera && photosLoading)}
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
