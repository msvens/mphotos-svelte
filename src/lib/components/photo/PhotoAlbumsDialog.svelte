<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { photosService, albumsService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import type { PhotoMetadata, Album } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MultiSelect, { type MultiSelectOption } from '$lib/components/ui/MultiSelect.svelte';

	interface PhotoAlbumsDialogProps {
		open: boolean;
		photo: PhotoMetadata;
		/** `changed` = membership was written, so the caller can refresh photostream state. */
		onClose: (changed?: boolean) => void;
	}

	let { open, photo, onClose }: PhotoAlbumsDialogProps = $props();

	const toast = getToastState();

	let albums = $state<Album[]>([]);
	let selectedAlbumIds = $state<string[]>([]);
	let changed = $state(false);
	let pendingSaves = $state(0);
	// Saves run one after another, so a quick run of ticks lands in click order and the
	// last write is the last selection.
	let saveChain: Promise<void> = Promise.resolve();

	let albumOptions = $derived<MultiSelectOption[]>(
		albums.map((a) => ({ value: a.id, label: a.name }))
	);

	onMount(async () => {
		try {
			albums = await albumsService.getAlbums();
		} catch (e) {
			console.error('Error fetching albums:', e);
		}
	});

	// Seed the photo's current albums each time the dialog opens (the photo may differ).
	$effect(() => {
		if (!open) return;
		untrack(() => {
			changed = false;
			void loadPhotoAlbums();
		});
	});

	async function loadPhotoAlbums() {
		try {
			const current = await photosService.getPhotoAlbums(photo.id);
			selectedAlbumIds = current.map((a) => a.id);
		} catch (e) {
			console.error('Error fetching photo albums:', e);
			selectedAlbumIds = [];
		}
	}

	// Tagging saves on every tick. With an explicit SAVE it was too easy to pick albums and
	// then close the dialog (backdrop, Escape) without saving, silently losing the picks.
	function onAlbumChange(ids: string[]) {
		selectedAlbumIds = ids;
		changed = true;
		const photoId = photo.id;
		pendingSaves++;
		saveChain = saveChain.then(() => save(photoId, ids)).finally(() => pendingSaves--);
	}

	async function save(photoId: string, ids: string[]) {
		try {
			try {
				await photosService.setPhotoAlbums(photoId, ids);
			} catch (e) {
				// Clearing all albums succeeds server-side, but the empty `IN (?)` makes the call
				// reject. Swallow only that; re-throw anything else.
				const msg = e instanceof Error ? e.message : String(e);
				if (!msg.includes('empty slice')) throw e;
			}
		} catch (e) {
			console.error('Error updating photo albums:', e);
			toast.error('Failed to update albums');
			// Show what the server actually has, not the pick that failed.
			await loadPhotoAlbums();
		}
	}

	/** Every way out waits for in-flight saves, so the caller refreshes after the last write. */
	async function close() {
		await saveChain;
		onClose(changed);
	}
</script>

<Dialog {open} onClose={close} maxWidth="lg" title="Photo Albums">
	<div class="space-y-2">
		<MultiSelect
			label="Albums"
			options={albumOptions}
			value={selectedAlbumIds}
			onChange={onAlbumChange}
			placeholder="Select albums..."
			fullWidth
		/>
		<p class="text-xs text-gray-600 dark:text-gray-400" aria-live="polite">
			{pendingSaves > 0 ? 'Saving…' : changed ? 'Saved' : 'Changes are saved as you pick.'}
		</p>
	</div>

	{#snippet actions()}
		<Button variant="text" onclick={close}>DONE</Button>
	{/snippet}
</Dialog>
