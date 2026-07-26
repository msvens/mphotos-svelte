<script lang="ts">
	import { albumsService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import type { Album } from '$lib/api/types';
	import Button from '$lib/components/ui/Button.svelte';
	import AlbumCard from './AlbumCard.svelte';
	import AlbumAddDialog from './AlbumAddDialog.svelte';
	import AlbumEditDialog from './AlbumEditDialog.svelte';
	import AlbumDeleteDialog from './AlbumDeleteDialog.svelte';

	interface AlbumGridProps {
		albums: Album[];
		/** Called after a create/update/delete so the parent can refetch. */
		onChanged?: () => void;
	}

	let { albums, onChanged }: AlbumGridProps = $props();

	const app = getAppState();
	const toast = getToastState();

	let showAdd = $state(false);
	let showEdit = $state(false);
	let showDelete = $state(false);
	let selected = $state<Album | undefined>(undefined);

	async function closeAdd(data?: Partial<Album>) {
		showAdd = false;
		if (!data) return;
		try {
			await albumsService.createAlbum(data.name ?? '', data.description ?? '', data.coverPic ?? '');
			onChanged?.();
		} catch (e) {
			console.error('Error creating album:', e);
			toast.error('Failed to create album');
		}
	}

	async function closeEdit(album?: Album) {
		showEdit = false;
		if (!album) return;
		try {
			await albumsService.updateAlbum(album);
			onChanged?.();
		} catch (e) {
			console.error('Error updating album:', e);
			toast.error('Failed to update album');
		}
	}

	async function closeDelete(album?: Album) {
		showDelete = false;
		if (!album) return;
		try {
			await albumsService.deleteAlbum(album.id);
			onChanged?.();
		} catch (e) {
			console.error('Error deleting album:', e);
			toast.error('Failed to delete album');
		}
	}

	function openEdit(album: Album) {
		selected = album;
		showEdit = true;
	}

	function openDelete(album: Album) {
		selected = album;
		showDelete = true;
	}
</script>

<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
	{#if app.isUser}
		<div class="flex flex-col overflow-hidden rounded bg-white dark:bg-gray-800">
			<img src="/photo-album.jpg" alt="Add album" class="h-48 w-full object-cover" />
			<div class="flex flex-grow flex-col justify-between p-4">
				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					Create a new Photo album. Afterwards you can add photos to it from the photo view.
				</p>
				<div>
					<Button variant="text" onclick={() => (showAdd = true)}>ADD ALBUM</Button>
				</div>
			</div>
		</div>
	{/if}
	{#each albums as album (album.id)}
		<AlbumCard
			{album}
			onEdit={app.isUser ? () => openEdit(album) : undefined}
			onDelete={app.isUser ? () => openDelete(album) : undefined}
		/>
	{/each}
</div>

{#if app.isUser}
	<AlbumAddDialog open={showAdd} onClose={closeAdd} />
	<AlbumEditDialog open={showEdit} album={selected} onClose={closeEdit} />
	<AlbumDeleteDialog open={showDelete} album={selected} onClose={closeDelete} />
{/if}
