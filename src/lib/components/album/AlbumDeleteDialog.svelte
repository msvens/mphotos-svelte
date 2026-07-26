<script lang="ts">
	import type { Album } from '$lib/api/types';
	import Dialog from '$lib/components/ui/Dialog.svelte';

	interface AlbumDeleteDialogProps {
		open: boolean;
		album?: Album;
		onClose: (album?: Album) => void;
	}

	let { open, album, onClose }: AlbumDeleteDialogProps = $props();
</script>

<Dialog
	{open}
	onClose={() => onClose(undefined)}
	onOk={() => onClose(album)}
	closeOnOk={false}
	title="Delete Album"
	text="Deleting an album will not remove the associated images"
	okText="DELETE"
/>
