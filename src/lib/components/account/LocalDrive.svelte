<script lang="ts">
	import { photosService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const app = getAppState();
	const photoState = getPhotoState();
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
		let duplicates = 0;
		let failed = 0;
		const total = files.length;
		// Sequential: the server dedups by md5 and rejects unsupported types per file, so one bad
		// file (e.g. a duplicate) must not abort the batch.
		for (let i = 0; i < total; i++) {
			const file = files[i];
			progress = { current: i + 1, total, fileName: file.name };
			try {
				await photosService.uploadLocalPhoto(file);
				uploaded++;
			} catch (e) {
				// The server rejects an already-stored image (matched by md5) with this message;
				// count those as skips rather than failures so the summary can tell them apart.
				if (e instanceof Error && /already exists/i.test(e.message)) duplicates++;
				else failed++;
				console.error(`Error uploading ${file.name}:`, e);
			}
		}
		uploading = false;
		progress = null;
		files = [];
		if (fileInput) fileInput.value = '';

		// The cached photo list predates these uploads; force a refresh so they appear in the
		// stream and photo deck without a full page reload.
		if (uploaded > 0) {
			await photoState.load(app.isUser, app.user.photoStreamAlbumId, true);
		}

		reportOutcome(uploaded, duplicates, failed, total);
	}

	/** Toast a summary that names already-uploaded skips and genuine failures separately. */
	function reportOutcome(uploaded: number, duplicates: number, failed: number, total: number) {
		if (uploaded === total) {
			toast.success(`Uploaded ${total} ${total === 1 ? 'photo' : 'photos'}`);
			return;
		}
		const parts: string[] = [];
		if (uploaded > 0) parts.push(`uploaded ${uploaded}`);
		if (duplicates > 0) parts.push(`skipped ${duplicates} already uploaded`);
		if (failed > 0) parts.push(`failed ${failed}`);
		const summary = parts.join(', ');
		const message = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}.`;
		// A failure is worth flagging; skipping duplicates is benign and just informational.
		if (failed > 0) toast.error(message);
		else toast.info(message);
	}
</script>

<div class="space-y-6">
	<div class="space-y-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Upload Photos</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Choose one or more photos to upload — JPEG, PNG, GIF, TIFF or BMP. Non-JPEG files are
			converted to JPEG on the server, and animated GIFs are saved as a single still frame. Files
			already in the service (matched by content) are skipped automatically.
		</p>

		<input
			bind:this={fileInput}
			type="file"
			accept="image/jpeg,image/png,image/gif,image/tiff,image/bmp"
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
