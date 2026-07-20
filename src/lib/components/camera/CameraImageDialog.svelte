<script lang="ts">
	import type { Camera } from '$lib/api/types';
	import { camerasService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';

	interface CameraImageDialogProps {
		camera: Camera;
		open: boolean;
		onClose: () => void;
		onUpdate: (camera: Camera) => void;
	}

	let { camera, open, onClose, onUpdate }: CameraImageDialogProps = $props();

	const toast = getToastState();

	let url = $state('');
	let selectedFile = $state<File | null>(null);
	let updating = $state(false);
	let fileInput = $state<HTMLInputElement>();

	function handleFileChange(event: Event) {
		const files = (event.currentTarget as HTMLInputElement).files;
		if (files && files.length > 0) selectedFile = files[0];
	}

	async function handleSubmit() {
		if (!url && !selectedFile) {
			toast.error('Please provide either a URL or choose a file');
			return;
		}
		updating = true;
		try {
			const updated = selectedFile
				? await camerasService.uploadCameraImage(camera.id, selectedFile)
				: await camerasService.updateCameraImageUrl(camera.id, url);
			onUpdate(updated);
			url = '';
			selectedFile = null;
			onClose();
		} catch (e) {
			console.error('Error updating camera image:', e);
			toast.error('Failed to update camera image');
		} finally {
			updating = false;
		}
	}

	let filesText = $derived(selectedFile ? selectedFile.name : 'selected files');
</script>

<Dialog
	{open}
	{onClose}
	onOk={handleSubmit}
	closeOnOk={false}
	title="Image URL"
	okText={updating ? 'UPDATING...' : 'OK'}
>
	<div class="space-y-4">
		<p class="text-sm text-gray-600 dark:text-gray-400">Choose Image for this Camera</p>

		<TextField label="Url" bind:value={url} fullWidth />

		<div class="relative">
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				onchange={handleFileChange}
				class="hidden"
			/>
			<div
				class="w-full rounded border border-gray-300 bg-transparent px-4 py-3 pr-40 text-sm text-gray-900 dark:border-gray-600 dark:text-white"
			>
				{filesText}
			</div>
			<button
				type="button"
				onclick={() => fileInput?.click()}
				disabled={updating}
				class="absolute top-2 right-2 px-3 py-1 text-sm text-gray-900 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:text-gray-200"
			>
				CHOOSE FILE
			</button>
		</div>
	</div>
</Dialog>
