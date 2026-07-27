<script lang="ts">
	import { PhotoOrder, type Album } from '$lib/api/types';
	import { randomCode } from '$lib/utils';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { SORT_OPTIONS, TEXTAREA_CLASS } from './albumSort';

	interface AlbumAddDialogProps {
		open: boolean;
		onClose: (album?: Partial<Album>) => void;
	}

	let { open, onClose }: AlbumAddDialogProps = $props();

	let name = $state('');
	let description = $state('');
	let hidden = $state(false);
	let code = $state('');
	let orderBy = $state<PhotoOrder>(PhotoOrder.None);

	function onHiddenToggle(e: Event & { currentTarget: HTMLInputElement }) {
		// Prefill a code the first time it's hidden; don't refill reactively, so it stays editable.
		if (e.currentTarget.checked && !code) code = randomCode();
	}

	function reset() {
		name = '';
		description = '';
		hidden = false;
		code = '';
		orderBy = PhotoOrder.None;
	}

	function handleOk() {
		// An empty code means "public"; only send a code when the album is hidden.
		onClose({ name, description, code: hidden ? code : '', orderBy, coverPic: '' });
		reset();
	}

	function handleClose() {
		onClose(undefined);
		reset();
	}
</script>

<Dialog
	{open}
	onClose={handleClose}
	onOk={handleOk}
	closeOnOk={false}
	title="Add Album"
	text="Create album. You can later add photos to it"
	okText="ADD"
>
	<div class="space-y-3">
		<TextField label="Name" bind:value={name} fullWidth />
		<div>
			<label for="album-add-desc" class="mb-1 block text-xs text-gray-600 dark:text-gray-400">
				Description
			</label>
			<textarea id="album-add-desc" bind:value={description} rows="2" class={TEXTAREA_CLASS}
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
