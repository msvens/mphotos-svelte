<script lang="ts">
	import { Icon, BookOpen, ArchiveBox } from 'svelte-hero-icons';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import Section from '$lib/components/layout/Section.svelte';
	import Bio from '$lib/components/home/Bio.svelte';
	import PhotoGrid from '$lib/components/photo/PhotoGrid.svelte';
	import ToggleSwitch from '$lib/components/ui/ToggleSwitch.svelte';
	import type { PhotoMetadata } from '$lib/api/types';

	const app = getAppState();
	const photoState = getPhotoState();
	const toast = getToastState();

	/** Owner only. Off shows every photo; on narrows to the photostream album. */
	let showPhotostream = $state(false);

	// The route owns the fetch — the store is state + actions only. `load` dedupes, so
	// re-running this costs nothing.
	$effect(() => {
		if (app.loading) return;
		void photoState.load(app.isUser, app.uxConfig.photoStreamAlbumId);
	});

	// Both lists are already in memory, so flipping the switch never refetches.
	let photos = $derived(showPhotostream ? photoState.streamPhotos : photoState.photos);

	// Only an owner looking at everything, and only photos outside the stream.
	const dimPhoto = (photo: PhotoMetadata) =>
		app.isUser && !showPhotostream && !photoState.streamIds.has(photo.id);

	async function toggleStream(photo: PhotoMetadata) {
		const albumId = app.uxConfig.photoStreamAlbumId;
		if (!albumId) return;
		try {
			await photoState.setInStream(albumId, photo, !photoState.streamIds.has(photo.id));
		} catch (e) {
			console.error('Error toggling photostream:', e);
			toast.error('Failed to update photostream');
		}
	}
</script>

<!-- Declared out here rather than inline: an `{#if app.isUser}` inside the snippet would
     still render the overlay's dark bar for guests. -->
{#snippet streamOverlay(photo: PhotoMetadata)}
	{@const inStream = photoState.streamIds.has(photo.id)}
	<button
		onclick={() => toggleStream(photo)}
		aria-label={inStream ? 'Remove from photostream' : 'Add to photostream'}
		class="cursor-pointer"
	>
		<Icon src={inStream ? BookOpen : ArchiveBox} class="h-6 w-6 text-white" />
	</button>
{/snippet}

<PageSpacing />

{#if app.loading}
	<div class="flex min-h-screen items-center justify-center">Loading...</div>
{:else}
	<div class="mx-auto max-w-[1024px]">
		{#if app.uxConfig.showBio}
			<Section showDivider>
				<Bio />
			</Section>
		{/if}

		{#if app.isUser && app.uxConfig.photoStreamAlbumId}
			<Section>
				<div class="flex justify-center">
					<ToggleSwitch bind:checked={showPhotostream} label="Show Photostream" />
				</div>
			</Section>
		{/if}

		<Section>
			<PhotoGrid
				{photos}
				columns={app.uxConfig.photoGridCols}
				spacing={app.uxConfig.photoGridSpacing}
				linkTo="/photo"
				{dimPhoto}
				overlay={app.isUser ? streamOverlay : undefined}
			/>
		</Section>
	</div>
{/if}
