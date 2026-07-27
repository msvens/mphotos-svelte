<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { photosService, albumsService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import type { PhotoMetadata, Album } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import MultiSelect, { type MultiSelectOption } from '$lib/components/ui/MultiSelect.svelte';

	interface PhotoAlbumsDialogProps {
		open: boolean;
		photo: PhotoMetadata;
		onClose: (changed?: boolean) => void;
	}

	let { open, photo, onClose }: PhotoAlbumsDialogProps = $props();

	const toast = getToastState();

	let albums = $state<Album[]>([]);
	let selectedAlbumIds = $state<string[]>([]);
	let changed = $state(false);
	let saving = $state(false);

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

	function onAlbumChange(ids: string[]) {
		selectedAlbumIds = ids;
		changed = true;
	}

	async function handleSave() {
		if (!changed) {
			onClose();
			return;
		}
		saving = true;
		try {
			try {
				await photosService.setPhotoAlbums(photo.id, selectedAlbumIds);
			} catch (e) {
				// Clearing all albums succeeds server-side, but the empty `IN (?)` makes the call
				// reject. Swallow only that; re-throw anything else.
				const msg = e instanceof Error ? e.message : String(e);
				if (!msg.includes('empty slice')) throw e;
			}
			toast.success('Albums updated');
			onClose(true);
		} catch (e) {
			console.error('Error updating photo albums:', e);
			toast.error('Failed to update albums');
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	{open}
	onClose={() => onClose()}
	onOk={handleSave}
	closeOnOk={false}
	maxWidth="lg"
	title="Photo Albums"
	okText={saving ? 'SAVING...' : 'SAVE'}
>
	<MultiSelect
		label="Albums"
		options={albumOptions}
		value={selectedAlbumIds}
		onChange={onAlbumChange}
		placeholder="Select albums..."
		fullWidth
	/>
</Dialog>
