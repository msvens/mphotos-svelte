<script lang="ts">
	import { PhotoOrder, type Album } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { SORT_OPTIONS, TEXTAREA_CLASS } from './albumSort';

	interface AlbumEditDialogProps {
		open: boolean;
		album?: Album;
		onClose: (album?: Album) => void;
	}

	let { open, album, onClose }: AlbumEditDialogProps = $props();

	// Assignable $derived: seeds from the album prop and re-seeds when it changes (switching
	// which album is edited); each control reassigns its value as the user types.
	let name = $derived(album?.name ?? '');
	let description = $derived(album?.description ?? '');
	let code = $derived(album?.code ?? '');
	let orderBy = $derived<PhotoOrder>(album?.orderBy ?? PhotoOrder.None);

	function handleOk() {
		if (album) {
			onClose({ ...album, name, description, code, orderBy });
		} else {
			onClose(undefined);
		}
	}
</script>

<Dialog
	{open}
	onClose={() => onClose(undefined)}
	onOk={handleOk}
	closeOnOk={false}
	title="Edit Album"
	text="Change album name or description"
	okText="OK"
>
	<div class="space-y-3">
		<TextField label="Name" bind:value={name} fullWidth />
		<div>
			<label for="album-edit-desc" class="mb-1 block text-xs text-gray-600 dark:text-gray-400">
				Description
			</label>
			<textarea id="album-edit-desc" bind:value={description} rows="2" class={TEXTAREA_CLASS}
			></textarea>
		</div>
		<TextField label="Code" bind:value={code} fullWidth />
		<Select
			label="Sorting"
			value={String(orderBy)}
			onChange={(v) => (orderBy = Number(v) as PhotoOrder)}
			options={SORT_OPTIONS}
			fullWidth
		/>
	</div>
</Dialog>
