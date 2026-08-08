<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { camerasService, photosService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import type { Camera, PhotoMetadata } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import PhotoDeck from '$lib/components/photo/photodeck/PhotoDeck.svelte';

	const app = getAppState();

	// The camera has its own deck: paging must stay within this camera's photos rather than
	// spilling into the full /photo stream. Load them the same way the grid page does.
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

<PageSpacing height="none" />

{#if camerasLoading || (camera && photosLoading)}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="text-gray-400">Loading photos...</div>
	</div>
{:else if !camera}
	<div class="py-12 text-center text-gray-400">Camera not found</div>
{:else}
	<!-- PhotoDeck owns the empty-list and unknown-id states (the latter links back to the grid). -->
	<PhotoDeck
		{photos}
		photoId={page.params.photoId ?? ''}
		urlPrefix={`/camera/${page.params.id}/photos/`}
		editControls={app.isUser}
		windowFullScreen={app.uxConfig.windowFullScreen}
	/>
{/if}
