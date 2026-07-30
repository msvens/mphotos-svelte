<script lang="ts">
	import { photosService } from '$lib/api/services';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const toast = getToastState();

	let files = $state<File[]>([]);
	let fileInput = $state<HTMLInputElement>();
	let uploading = $state(false);
	let progress = $state<{ current: number; total: number; fileName: string } | null>(null);

	function handleFileChange(event: Event) {
		const list = (event.currentTarget as HTMLInputElement).files;
		files = list ? Array.from(list) : [];
	}

	async function handleUpload() {
		if (files.length === 0) return;
		uploading = true;
		let uploaded = 0;
		const total = files.length;
		// Sequential: the server dedups by md5 and rejects non-jpeg per file, so a failed file
		// (e.g. a duplicate) must not abort the batch.
		for (let i = 0; i < total; i++) {
			const file = files[i];
			progress = { current: i + 1, total, fileName: file.name };
			try {
				await photosService.uploadLocalPhoto(file);
				uploaded++;
			} catch (e) {
				console.error(`Error uploading ${file.name}:`, e);
			}
		}
		uploading = false;
		progress = null;
		files = [];
		if (fileInput) fileInput.value = '';

		if (uploaded === total) {
			toast.success(`Uploaded ${uploaded} of ${total} photos`);
		} else {
			toast.warning(
				`Uploaded ${uploaded} of ${total} photos — ${total - uploaded} skipped or failed`
			);
		}
	}
</script>

<div class="space-y-6">
	<div class="space-y-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Upload Photos</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Choose one or more JPEG photos to upload. Files already in the service (matched by content)
			are skipped automatically.
		</p>

		<input
			bind:this={fileInput}
			type="file"
			accept="image/jpeg"
			multiple
			onchange={handleFileChange}
			class="hidden"
		/>

		<div class="flex items-center gap-3">
			<Button onclick={() => fileInput?.click()} variant="outlined" disabled={uploading}>
				CHOOSE FILES
			</Button>
			<span class="text-sm text-gray-600 dark:text-gray-400">
				{files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
			</span>
		</div>

		<Button onclick={handleUpload} disabled={files.length === 0 || uploading}>
			{uploading ? 'UPLOADING...' : 'UPLOAD PHOTOS'}
		</Button>

		{#if progress}
			<div class="space-y-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Uploading {progress.current} of {progress.total}: {progress.fileName}
				</p>
				<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						class="h-full bg-blue-500 transition-all"
						style="width: {(progress.current / progress.total) * 100}%"
					></div>
				</div>
			</div>
		{/if}
	</div>
</div>
