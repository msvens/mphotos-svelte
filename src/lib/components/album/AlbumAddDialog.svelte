<script lang="ts">
	import { PhotoOrder, type Album } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { SORT_OPTIONS, TEXTAREA_CLASS } from './albumSort';

	interface AlbumAddDialogProps {
		open: boolean;
		onClose: (album?: Partial<Album>) => void;
	}

	let { open, onClose }: AlbumAddDialogProps = $props();

	let name = $state('');
	let description = $state('');
	let code = $state('');
	let orderBy = $state<PhotoOrder>(PhotoOrder.None);

	function reset() {
		name = '';
		description = '';
		code = '';
		orderBy = PhotoOrder.None;
	}

	function handleOk() {
		onClose({ name, description, code, orderBy, coverPic: '' });
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
