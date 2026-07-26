<script lang="ts">
	import { Icon, Pencil, Trash } from 'svelte-hero-icons';
	import type { Album } from '$lib/api/types';

	interface AlbumCardProps {
		album: Album;
		/** Owner-only: when provided, an edit/delete row is shown below the card. */
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let { album, onEdit, onDelete }: AlbumCardProps = $props();

	const FALLBACK = '/photo-album.jpg';

	// A private album (non-empty code) carries its code in the share link so the owner's
	// listing can hand it out; a guest reaches it only via that URL.
	let href = $derived(
		album.code ? `/album/${album.id}?code=${encodeURIComponent(album.code)}` : `/album/${album.id}`
	);

	let failed = $state(false);
	let imgSrc = $derived(failed || !album.coverPic ? FALLBACK : album.coverPic);

	function handleImageError() {
		failed = true;
	}
</script>

<div class="overflow-hidden rounded bg-white dark:bg-gray-800">
	<a
		{href}
		class="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
	>
		<img
			src={imgSrc}
			alt={album.name}
			onerror={handleImageError}
			class="h-48 w-full object-cover transition-opacity hover:opacity-90"
		/>
		<div class="p-4">
			<h3 class="mb-1 text-lg font-medium text-gray-900 dark:text-white">{album.name}</h3>
			<p class="text-sm text-gray-600 dark:text-gray-400">{album.description}</p>
		</div>
	</a>
	{#if onEdit || onDelete}
		<div class="flex gap-2 px-4 pb-4">
			{#if onEdit}
				<button
					onclick={onEdit}
					aria-label="Edit album"
					title="Edit album"
					class="p-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				>
					<Icon src={Pencil} class="h-5 w-5" />
				</button>
			{/if}
			{#if onDelete}
				<button
					onclick={onDelete}
					aria-label="Delete album"
					title="Delete album"
					class="p-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				>
					<Icon src={Trash} class="h-5 w-5" />
				</button>
			{/if}
		</div>
	{/if}
</div>
