<script lang="ts">
	import { onMount } from 'svelte';
	import { albumsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import type { Album } from '$lib/api/types';
	import PageSpacing from '$lib/components/layout/PageSpacing.svelte';
	import AlbumGrid from '$lib/components/album/AlbumGrid.svelte';

	const app = getAppState();

	let albums = $state<Album[]>([]);
	let loading = $state(true);

	// Guests get only public albums — the backend hides coded (private) albums from the list.
	async function fetchAlbums() {
		try {
			albums = await albumsService.getAlbums();
		} catch (e) {
			console.error('Error fetching albums:', e);
		}
	}

	onMount(async () => {
		await fetchAlbums();
		loading = false;
	});
</script>

<PageSpacing />

{#if loading}
	<div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
		<div class="animate-pulse text-gray-400">Loading...</div>
	</div>
{:else}
	<div class="mx-auto max-w-[1024px]">
		<h1 class="mb-6 text-2xl font-light">Photo Albums</h1>
		{#if albums.length === 0 && !app.isUser}
			<div class="py-12 text-center text-gray-400">No albums yet</div>
		{:else}
			<AlbumGrid {albums} onChanged={fetchAlbums} />
		{/if}
	</div>
{/if}
