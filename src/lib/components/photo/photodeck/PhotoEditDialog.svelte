<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { photosService, albumsService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import type { PhotoMetadata, Album } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import MultiSelect, { type MultiSelectOption } from '$lib/components/ui/MultiSelect.svelte';

	interface PhotoEditDialogProps {
		open: boolean;
		photo: PhotoMetadata;
		onClose: (updated?: PhotoMetadata) => void;
	}

	let { open, photo, onClose }: PhotoEditDialogProps = $props();

	const toast = getToastState();

	let albums = $state<Album[]>([]);
	let title = $state('');
	let keywords = $state('');
	let description = $state('');
	let selectedAlbumIds = $state<string[]>([]);
	let photoChanged = $state(false);
	let albumChanged = $state(false);
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

	// Seed the form when the dialog opens — not on every `photo` change, so navigating the
	// deck behind a closed dialog doesn't reset in-progress edits.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			title = photo.title;
			// Space after each comma for readability; the service trims on save.
			keywords = photo.keywords.replace(/,(?!\s)/g, ', ');
			description = photo.description;
			photoChanged = false;
			albumChanged = false;
			void loadAlbums();
		});
	});

	async function loadAlbums() {
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
		albumChanged = true;
	}

	async function handleSave() {
		if (!albumChanged && !photoChanged) {
			onClose();
			return;
		}
		saving = true;
		try {
			let updated = photo;
			if (albumChanged) {
				try {
					await photosService.setPhotoAlbums(photo.id, selectedAlbumIds);
				} catch (e) {
					// Clearing all albums still succeeds server-side, but the empty `IN (?)`
					// makes the call reject. Swallow only that; re-throw anything else.
					const msg = e instanceof Error ? e.message : String(e);
					if (!msg.includes('empty slice')) throw e;
				}
			}
			if (photoChanged) {
				updated = await photosService.updatePhoto(photo.id, title, description, keywords);
			}
			toast.success('Photo updated successfully');
			onClose(updated);
		} catch (e) {
			console.error('Error updating photo:', e);
			const msg = e instanceof Error ? e.message : JSON.stringify(e);
			toast.error(`Failed to update photo: ${msg}`);
		} finally {
			saving = false;
		}
	}

	// Matches TextField's input classes, so the textarea sits consistently among the fields.
	const textareaClass =
		'w-full resize-none rounded border border-gray-300 bg-transparent px-3 py-2 text-gray-900 placeholder:text-gray-600 hover:border-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400 dark:hover:border-white';
	const labelClass = 'mb-1 block text-xs text-gray-600 dark:text-gray-400';
</script>

<Dialog
	{open}
	onClose={() => onClose()}
	onOk={handleSave}
	closeOnOk={false}
	maxWidth="lg"
	title="Edit Photo"
	okText={saving ? 'SAVING...' : 'SAVE'}
>
	<div class="space-y-4">
		<TextField label="Title" bind:value={title} fullWidth oninput={() => (photoChanged = true)} />

		<TextField
			label="Keywords"
			bind:value={keywords}
			fullWidth
			placeholder="Comma separated"
			oninput={() => (photoChanged = true)}
		/>

		<div>
			<label class={labelClass} for="edit-description">Description</label>
			<textarea
				id="edit-description"
				bind:value={description}
				oninput={() => (photoChanged = true)}
				rows={2}
				class={textareaClass}></textarea>
		</div>

		<MultiSelect
			label="Albums"
			options={albumOptions}
			value={selectedAlbumIds}
			onChange={onAlbumChange}
			placeholder="Select albums..."
			fullWidth
		/>
	</div>
</Dialog>
