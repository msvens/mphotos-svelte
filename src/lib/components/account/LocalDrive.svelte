<script lang="ts">
	import { onMount } from 'svelte';
	import { capabilitiesService, isJob, photosService } from '$lib/api/services';
	import { ApiError } from '$lib/api/client';
	import { JobState, type JobFailure } from '$lib/api/types';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { failureSummary, hasHdrFailure, HDR_HINT, pollJob } from './jobs';

	const IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/tiff,image/bmp';
	// The server sniffs the container (mp4/mov/avi) and transcodes to H.264 MP4.
	const VIDEO_TYPES = 'video/mp4,video/quicktime,video/x-msvideo';

	const app = getAppState();
	const photoState = getPhotoState();
	const toast = getToastState();

	let files = $state<File[]>([]);
	let fileInput = $state<HTMLInputElement>();
	let uploading = $state(false);
	let progress = $state<{
		current: number;
		total: number;
		fileName: string;
		transcoding: boolean;
	} | null>(null);
	/** Only offer video when the server can transcode it (ffmpeg installed). */
	let videoEnabled = $state(false);

	onMount(async () => {
		try {
			videoEnabled = (await capabilitiesService.getCapabilities()).videoEnabled;
		} catch (e) {
			console.error('Error fetching capabilities:', e);
		}
	});

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
		const failures: JobFailure[] = [];
		const total = files.length;
		const noun = nounFor(files);
		// Sequential: the server dedups by md5 and rejects unsupported types per file, so one bad
		// file (e.g. a duplicate) must not abort the batch.
		for (let i = 0; i < total; i++) {
			const file = files[i];
			progress = { current: i + 1, total, fileName: file.name, transcoding: false };
			try {
				const result = await photosService.uploadLocalPhoto(file);
				if (isJob(result)) {
					// A video comes back as a transcode job; wait for it so the summary is exact and
					// the server's one video worker isn't handed a queue of them at once.
					progress = { ...progress, transcoding: true };
					const job = await pollJob(result.id);
					if (job.state === JobState.ABORTED) {
						failed++;
						failures.push({ name: file.name, category: 'error' });
					} else {
						uploaded += job.numAdded;
						duplicates += job.numSkipped;
						failed += job.numFailed;
						failures.push(...(job.failures ?? []));
					}
				} else {
					uploaded++;
				}
			} catch (e) {
				// The server rejects an already-stored file (matched by md5) with this message;
				// count those as skips rather than failures so the summary can tell them apart.
				if (e instanceof Error && /already exists/i.test(e.message)) duplicates++;
				else {
					failed++;
					// nginx refuses an over-limit body with a 413 before it reaches the server.
					if (e instanceof ApiError && e.status === 413) {
						failures.push({ name: file.name, category: 'too-large' });
					}
				}
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

		reportOutcome(uploaded, duplicates, failed, total, failures, noun);
	}

	/** What to call the batch in the summary: photos, videos, or (mixed) files. */
	function nounFor(batch: File[]): [string, string] {
		const videos = batch.filter((f) => f.type.startsWith('video/')).length;
		if (videos === 0) return ['photo', 'photos'];
		if (videos === batch.length) return ['video', 'videos'];
		return ['file', 'files'];
	}

	/** Toast a summary that names already-uploaded skips and genuine failures separately. */
	function reportOutcome(
		uploaded: number,
		duplicates: number,
		failed: number,
		total: number,
		failures: JobFailure[],
		[one, many]: [string, string]
	) {
		if (uploaded === total) {
			toast.success(`Uploaded ${total} ${total === 1 ? one : many}`);
			return;
		}
		const parts: string[] = [];
		if (uploaded > 0) parts.push(`uploaded ${uploaded}`);
		if (duplicates > 0) parts.push(`skipped ${duplicates} already uploaded`);
		if (failed > 0) parts.push(`failed ${failed}`);
		const summary = parts.join(', ');
		// "failed N" is always the last part, so the reasons can follow it directly.
		const reasons = failures.length > 0 ? `: ${failureSummary(failures)}` : '';
		let message = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}${reasons}.`;
		if (hasHdrFailure(failures)) message += ` ${HDR_HINT}`;
		// A failure is worth flagging; skipping duplicates is benign and just informational.
		if (failed > 0) toast.error(message);
		else toast.info(message);
	}
</script>

<div class="space-y-6">
	<div class="space-y-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">
			{videoEnabled ? 'Upload Photos & Videos' : 'Upload Photos'}
		</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Choose one or more photos to upload — JPEG, PNG, GIF, TIFF or BMP. Non-JPEG files are
			converted to JPEG on the server, and animated GIFs are saved as a single still frame. Files
			already in the service (matched by content) are skipped automatically.
		</p>
		{#if videoEnabled}
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Videos (MP4, MOV or AVI) are transcoded on the server, which can take a few minutes each.
				HDR video isn't supported.
			</p>
		{/if}

		<input
			bind:this={fileInput}
			type="file"
			accept={videoEnabled ? `${IMAGE_TYPES},${VIDEO_TYPES}` : IMAGE_TYPES}
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
			{uploading ? 'UPLOADING...' : videoEnabled ? 'UPLOAD FILES' : 'UPLOAD PHOTOS'}
		</Button>

		{#if progress}
			<div class="space-y-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{progress.transcoding ? 'Transcoding' : 'Uploading'}
					{progress.current} of {progress.total}: {progress.fileName}
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
