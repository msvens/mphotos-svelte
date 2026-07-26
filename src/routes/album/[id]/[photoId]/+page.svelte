<script lang="ts">
	import { page } from '$app/state';
	import { albumsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import type { PhotoMetadata } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import PhotoDeck from '$lib/components/photo/photodeck/PhotoDeck.svelte';

	const app = getAppState();

	// The album has its own deck: a guest's `/photo` deck is the photostream, which won't
	// contain an arbitrary album photo. Load the album's photos and navigate within them.
	let photos = $state<PhotoMetadata[]>([]);
	let loading = $state(true);
	let error = $state(false);

	let code = $derived(page.url.searchParams.get('code') ?? '');
	let codeQuery = $derived(code ? `?code=${encodeURIComponent(code)}` : '');

	$effect(() => {
		const id = page.params.id;
		const c = code;
		if (!id) return;
		let cancelled = false;
		loading = true;
		error = false;
		(async () => {
			try {
				const list = await albumsService.getAlbumPhotos(id, c || undefined);
				if (cancelled) return;
				photos = list.photos;
			} catch (e) {
				if (cancelled) return;
				console.error('Error fetching album photos:', e);
				error = true;
				photos = [];
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => (cancelled = true);
	});
</script>

<PageSpacing height="none" />

{#if loading}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="text-gray-400">Loading photos...</div>
	</div>
{:else if error}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="text-red-400">Failed to fetch photos</div>
	</div>
{:else}
	<PhotoDeck
		{photos}
		photoId={page.params.photoId ?? ''}
		urlPrefix={`/album/${page.params.id}/`}
		searchQuery={codeQuery}
		editControls={app.isUser}
		windowFullScreen={app.uxConfig.windowFullScreen}
	/>
{/if}
