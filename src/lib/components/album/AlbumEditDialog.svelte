<script lang="ts">
	import { PhotoOrder, type Album } from '$lib/api/types';
	import { randomCode } from '$lib/utils';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { SORT_OPTIONS, TEXTAREA_CLASS } from './albumSort';

	interface AlbumEditDialogProps {
		open: boolean;
		album?: Album;
		onClose: (album?: Album) => void;
	}

	let { open, album, onClose }: AlbumEditDialogProps = $props();

	// Assignable $derived: seeds from the album prop and re-seeds when it changes (switching
	// which album is edited); each control reassigns its value as the user types. An album with
	// a non-empty code is "hidden".
	let name = $derived(album?.name ?? '');
	let description = $derived(album?.description ?? '');
	let hidden = $derived(!!album?.code);
	let code = $derived(album?.code ?? '');
	let orderBy = $derived<PhotoOrder>(album?.orderBy ?? PhotoOrder.None);

	function onHiddenToggle(e: Event & { currentTarget: HTMLInputElement }) {
		if (e.currentTarget.checked && !code) code = randomCode();
	}

	function handleOk() {
		if (album) {
			// Unchecking "hidden" clears the code, republishing the album.
			onClose({ ...album, name, description, code: hidden ? code : '', orderBy });
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
		<Checkbox bind:checked={hidden} label="Hidden — share by link only" onchange={onHiddenToggle} />
		{#if hidden}
			<TextField label="Share code" bind:value={code} fullWidth />
		{/if}
		<Select
			label="Sorting"
			value={String(orderBy)}
			onChange={(v) => (orderBy = Number(v) as PhotoOrder)}
			options={SORT_OPTIONS}
			fullWidth
		/>
	</div>
</Dialog>
