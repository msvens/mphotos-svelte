<script lang="ts">
	import { onMount } from 'svelte';
	import { photosService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';

	const toast = getToastState();

	let photoCount = $state(0);
	let openDeleteDialog = $state(false);
	let deleting = $state(false);

	onMount(async () => {
		try {
			// `length` is a field on PhotoList, not an array length.
			photoCount = (await photosService.getPhotos()).length;
		} catch (e) {
			console.error('Error fetching photo count:', e);
		}
	});

	async function handleDeleteAll() {
		deleting = true;
		try {
			const result = await photosService.deletePhotos(true);
			toast.success(`Successfully deleted ${result.length} photos`);
			photoCount = 0;
			openDeleteDialog = false;
		} catch (error) {
			console.error('Error deleting photos:', error);
			toast.error('Failed to delete photos');
		} finally {
			deleting = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="space-y-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Delete All Photos</h3>
		<p class="text-sm text-gray-900 dark:text-white">
			<strong>Warning!</strong> This action removes all photos from the service and deletes all physical
			copies from the server. This operation cannot be undone.
		</p>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Total photos in service: <strong>{photoCount}</strong>
		</p>
		<Button
			onclick={() => (openDeleteDialog = true)}
			variant="outlined"
			color="error"
			disabled={photoCount === 0}
		>
			DELETE ALL PHOTOS
		</Button>
	</div>

	<Dialog
		open={openDeleteDialog}
		onClose={() => !deleting && (openDeleteDialog = false)}
		title="Delete All Photos?"
	>
		<p class="text-sm text-gray-900 dark:text-white">
			Are you sure you want to delete all <strong>{photoCount}</strong> photos? This will remove all image
			data from the server and cannot be undone.
		</p>

		{#snippet actions()}
			<Button onclick={() => (openDeleteDialog = false)} variant="outlined" disabled={deleting}>
				CANCEL
			</Button>
			<Button onclick={handleDeleteAll} color="error" disabled={deleting}>
				{deleting ? 'DELETING...' : 'DELETE ALL'}
			</Button>
		{/snippet}
	</Dialog>
</div>
