<script lang="ts">
	import { page } from '$app/state';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import PhotoDeck from '$lib/components/photo/photodeck/PhotoDeck.svelte';

	const app = getAppState();
	const photoState = getPhotoState();

	// The route owns the fetch. `load` dedupes, so arriving from the home grid costs
	// nothing — the list is already in the store.
	$effect(() => {
		if (app.loading) return;
		void photoState.load(app.isUser, app.uxConfig.photoStreamAlbumId);
	});

	let searchQuery = $derived(
		page.url.searchParams.get('q') ? `?q=${page.url.searchParams.get('q')}` : ''
	);
</script>

<PageSpacing height="none" />

{#if app.loading || photoState.loading}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="text-gray-400">Loading photos...</div>
	</div>
{:else if photoState.error}
	<div class="flex h-[80vh] items-center justify-center">
		<div class="text-red-400">{photoState.error}</div>
	</div>
{:else}
	<PhotoDeck
		photos={photoState.photos}
		photoId={page.params.id ?? ''}
		urlPrefix="/photo/"
		{searchQuery}
		editControls={app.isUser}
		windowFullScreen={app.uxConfig.windowFullScreen}
	/>
{/if}
