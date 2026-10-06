<script lang="ts">
	import { onMount } from 'svelte';
	import { capabilitiesService, isJob, photosService } from '$lib/api/services';
	import { ApiError } from '$lib/api/client';
	import { JobState, type JobFailure } from '$lib/api/types';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { failureSummary, hasHdrFailure, HDR_HINT, pollJob } from './jobs';
	import { IMAGE_TYPES, isSupported, md5File, VIDEO_TYPES } from './localScan';

	const app = getAppState();
	const photoState = getPhotoState();
	const toast = getToastState();

	let fileInput = $state<HTMLInputElement>();
	let folderInput = $state<HTMLInputElement>();
	let hashing = $state<{
		current: number;
		total: number;
		fileName: string;
		bytes: number;
		totalBytes: number;
	} | null>(null);
	let checking = $state(false);
	// Only read inside the hashing loop, so it needs no reactivity.
	let cancelled = false;
	/** The result of a pick, awaiting confirmation: which files are new, and what was skipped. */
	let scan = $state<{
		fresh: File[];
		checked: number;
		repeats: number;
		unsupported: number;
	} | null>(null);
	let uploading = $state(false);
	let busy = $derived(hashing !== null || checking || uploading);
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

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	const pathOf = (file: File) => file.webkitRelativePath || file.name;

	/** Hash what was picked and ask the server which files it lacks; the dialog takes it from there. */
	async function handlePick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const picked = Array.from(input.files ?? []);
		// Reset now so picking the same folder again still fires `change`.
		input.value = '';
		if (picked.length === 0) return;

		const supported = picked.filter((f) => isSupported(f, videoEnabled));
		// Identical content under two names (or in two subfolders) is hashed twice but uploaded once.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local to this call, never rendered
		const byHash = new Map<string, File>();
		let repeats = 0;
		try {
			const totalBytes = supported.reduce((sum, f) => sum + f.size, 0);
			let bytes = 0;
			for (let i = 0; i < supported.length && !cancelled; i++) {
				const file = supported[i];
				hashing = {
					current: i + 1,
					total: supported.length,
					fileName: pathOf(file),
					bytes,
					totalBytes
				};
				const md5 = await md5File(file, (n) => {
					bytes += n;
					if (hashing) hashing.bytes = bytes;
				});
				if (byHash.has(md5)) repeats++;
				else byHash.set(md5, file);
			}
			hashing = null;
			if (cancelled) return;

			checking = true;
			const known = byHash.size > 0 ? await photosService.checkLocalPhotos([...byHash.keys()]) : {};
			scan = {
				fresh: [...byHash].filter(([md5]) => !known[md5]).map(([, file]) => file),
				checked: byHash.size,
				repeats,
				unsupported: picked.length - supported.length
			};
		} catch (e) {
			console.error('Error checking local files:', e);
			toast.error('Failed to check which files are new');
		} finally {
			hashing = null;
			checking = false;
			cancelled = false;
		}
	}

	async function handleUpload(files: File[]) {
		scan = null;
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
			Choose photos, or a whole folder, to upload — JPEG, PNG, GIF, TIFF or BMP. Each file is
			checked against the service first (matched by content), so only new files are uploaded.
			Non-JPEG files are converted to JPEG on the server, and animated GIFs are saved as a single
			still frame.
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
			accept={(videoEnabled ? [...IMAGE_TYPES, ...VIDEO_TYPES] : IMAGE_TYPES).join(',')}
			multiple
			onchange={handlePick}
			class="hidden"
		/>
		<!-- Browsers ignore `accept` on a folder picker; `isSupported` filters what comes back. -->
		<input
			bind:this={folderInput}
			type="file"
			webkitdirectory
			multiple
			onchange={handlePick}
			class="hidden"
		/>

		<div class="flex flex-wrap items-center gap-3">
			<Button onclick={() => fileInput?.click()} variant="outlined" disabled={busy}>
				CHOOSE FILES
			</Button>
			<Button onclick={() => folderInput?.click()} variant="outlined" disabled={busy}>
				CHOOSE FOLDER
			</Button>
		</div>

		{#if hashing}
			<div class="space-y-1">
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Checking {hashing.current} of {hashing.total}: {hashing.fileName}
				</p>
				<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
					<div
						class="h-full bg-blue-500 transition-all"
						style="width: {hashing.totalBytes ? (hashing.bytes / hashing.totalBytes) * 100 : 100}%"
					></div>
				</div>
				<Button onclick={() => (cancelled = true)} variant="text">CANCEL</Button>
			</div>
		{:else if checking}
			<p class="text-sm text-gray-600 dark:text-gray-400">Asking the server which files are new…</p>
		{/if}

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

<Dialog open={scan !== null} onClose={() => (scan = null)} title="Upload to the service">
	{#if scan}
		<div class="space-y-2 text-sm text-gray-900 dark:text-white">
			<p>
				{scan.fresh.length === 0
					? 'There is nothing new to upload.'
					: `${scan.fresh.length} new of ${plural(scan.checked, 'file')}.`}
			</p>
			{#if scan.repeats > 0}
				<p class="text-gray-600 dark:text-gray-400">
					{plural(scan.repeats, 'duplicate')} within the selection skipped.
				</p>
			{/if}
			{#if scan.unsupported > 0}
				<p class="text-gray-600 dark:text-gray-400">
					{plural(scan.unsupported, 'unsupported file')} skipped.
				</p>
			{/if}
			{#if scan.fresh.length > 0}
				<details>
					<summary class="cursor-pointer text-gray-600 dark:text-gray-400">Show new files</summary>
					<ul class="mt-2 max-h-60 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
						{#each scan.fresh as file (file)}
							<li>{pathOf(file)}</li>
						{/each}
					</ul>
				</details>
			{/if}
		</div>
	{/if}

	{#snippet actions()}
		<Button onclick={() => (scan = null)} variant="outlined">CANCEL</Button>
		<Button onclick={() => scan && handleUpload(scan.fresh)} disabled={!scan?.fresh.length}>
			UPLOAD
		</Button>
	{/snippet}
</Dialog>
