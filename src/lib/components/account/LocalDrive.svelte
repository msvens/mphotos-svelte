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

	/**
	 * Where a pick is: hashing every supported file, uploading the new ones, or done. Picking is
	 * the go-ahead, so there is no confirmation step; the dialog is open whenever this is set.
	 */
	type Phase =
		| {
				kind: 'checking';
				current: number;
				total: number;
				fileName: string;
				bytes: number;
				totalBytes: number;
		  }
		| { kind: 'uploading'; current: number; total: number; fileName: string; transcoding: boolean }
		| { kind: 'done'; message: string; failed: boolean };
	let phase = $state<Phase | null>(null);
	/** STOP was pressed: checking ends at once, uploading after the current file. */
	let stopping = $state(false);
	/** Only offer video when the server can transcode it (ffmpeg installed). */
	let videoEnabled = $state(false);

	onMount(async () => {
		try {
			videoEnabled = (await capabilitiesService.getCapabilities()).videoEnabled;
		} catch (e) {
			console.error('Error fetching capabilities:', e);
		}
	});

	const pathOf = (file: File) => file.webkitRelativePath || file.name;

	// Up to this many already-uploaded files are named when there is nothing new.
	const NAMED_LIMIT = 3;

	/** `"a.jpg"`, `"a.jpg and b.jpg"`, `"a.jpg, b.jpg and c.jpg"`. */
	function nameList(files: File[]): string {
		const names = files.map(pathOf);
		return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
	}

	/** Why a pick led to no upload. */
	function nothingNew(existing: File[]): string {
		if (existing.length === 0) return 'None of the chosen files can be uploaded.';
		if (existing.length <= NAMED_LIMIT) {
			const verb = existing.length === 1 ? 'is' : 'are';
			return `Nothing new to upload: ${nameList(existing)} ${verb} already uploaded.`;
		}
		return `Nothing new to upload: all ${existing.length} files are already uploaded.`;
	}

	/** Hash what was picked, ask the server which files it lacks, and upload those. */
	async function handlePick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const picked = Array.from(input.files ?? []);
		// Reset now so picking the same folder again still fires `change`.
		input.value = '';
		if (picked.length === 0) return;

		const supported = picked.filter((f) => isSupported(f, videoEnabled));
		// Identical content under two names (or in two subfolders) is uploaded once.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local to this call, never rendered
		const byHash = new Map<string, File>();
		let known: Record<string, boolean>;
		stopping = false;
		try {
			const totalBytes = supported.reduce((sum, f) => sum + f.size, 0);
			let bytes = 0;
			for (let i = 0; i < supported.length; i++) {
				const file = supported[i];
				phase = {
					kind: 'checking',
					current: i + 1,
					total: supported.length,
					fileName: pathOf(file),
					bytes,
					totalBytes
				};
				const md5 = await md5File(file, (n) => {
					bytes += n;
					if (phase?.kind === 'checking') phase.bytes = bytes;
				});
				if (stopping) {
					phase = null;
					return;
				}
				if (!byHash.has(md5)) byHash.set(md5, file);
			}
			known = byHash.size > 0 ? await photosService.checkLocalPhotos([...byHash.keys()]) : {};
		} catch (e) {
			console.error('Error checking local files:', e);
			toast.error('Failed to check which files are new');
			phase = null;
			return;
		}

		const entries = [...byHash];
		const fresh = entries.filter(([md5]) => !known[md5]).map(([, file]) => file);
		if (fresh.length === 0) {
			const existing = entries.filter(([md5]) => known[md5]).map(([, file]) => file);
			phase = { kind: 'done', message: nothingNew(existing), failed: false };
			return;
		}
		await upload(fresh);
	}

	async function upload(files: File[]) {
		let uploaded = 0;
		let duplicates = 0;
		let failed = 0;
		let processed = 0;
		const failures: JobFailure[] = [];
		const total = files.length;
		// Sequential: the server rejects unsupported types per file, so one bad file must not abort
		// the batch. STOP is honoured between files.
		for (; processed < total && !stopping; processed++) {
			const file = files[processed];
			phase = {
				kind: 'uploading',
				current: processed + 1,
				total,
				fileName: pathOf(file),
				transcoding: false
			};
			try {
				const result = await photosService.uploadLocalPhoto(file);
				if (isJob(result)) {
					// A video comes back as a transcode job; wait for it so the summary is exact and
					// the server's one video worker isn't handed a queue of them at once.
					phase.transcoding = true;
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
				// Only reachable if the file was uploaded after the check (e.g. from another tab).
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

		// The cached photo list predates these uploads; force a refresh so they appear in the
		// stream and photo deck without a full page reload.
		if (uploaded > 0) {
			await photoState.load(app.isUser, app.user.photoStreamAlbumId, true);
		}

		phase = {
			kind: 'done',
			message: outcome(
				uploaded,
				duplicates,
				failed,
				total,
				failures,
				nounFor(files),
				processed < total
			),
			failed: failed > 0
		};
	}

	/** What to call the batch in the summary: photos, videos, or (mixed) files. */
	function nounFor(batch: File[]): [string, string] {
		const videos = batch.filter((f) => f.type.startsWith('video/')).length;
		if (videos === 0) return ['photo', 'photos'];
		if (videos === batch.length) return ['video', 'videos'];
		return ['file', 'files'];
	}

	/** `"Uploaded 3 new photos."`, or what went differently: a stop, failures and why. */
	function outcome(
		uploaded: number,
		duplicates: number,
		failed: number,
		total: number,
		failures: JobFailure[],
		[one, many]: [string, string],
		stopped: boolean
	): string {
		const noun = total === 1 ? one : many;
		if (uploaded === total) return `Uploaded ${total} new ${noun}.`;
		const parts: string[] = [];
		if (uploaded > 0) parts.push(`uploaded ${uploaded} of ${total} new ${noun}`);
		if (duplicates > 0)
			parts.push(`${duplicates} ${duplicates === 1 ? 'was' : 'were'} already uploaded`);
		if (failed > 0) parts.push(`failed ${failed}`);
		if (parts.length === 0) parts.push(`uploaded none of ${total} new ${noun}`);
		const summary = parts.join(', ');
		// "failed N" is always the last part, so the reasons can follow it directly.
		const reasons = failures.length > 0 ? `: ${failureSummary(failures)}` : '';
		let message = `${summary.charAt(0).toUpperCase()}${summary.slice(1)}${reasons}.`;
		if (stopped) message = `Stopped. ${message}`;
		if (hasHdrFailure(failures)) message += ` ${HDR_HINT}`;
		return message;
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
			<Button onclick={() => fileInput?.click()} variant="outlined" disabled={phase !== null}>
				CHOOSE FILES
			</Button>
			<Button onclick={() => folderInput?.click()} variant="outlined" disabled={phase !== null}>
				CHOOSE FOLDER
			</Button>
		</div>
	</div>
</div>

<Dialog
	open={phase !== null}
	onClose={() => phase?.kind === 'done' && (phase = null)}
	title="Upload to the service"
>
	{#if phase?.kind === 'checking'}
		<div class="space-y-2">
			<p class="text-sm text-gray-900 dark:text-white">
				Looking for new files: {phase.current} of {phase.total}
			</p>
			<p class="truncate text-xs text-gray-600 dark:text-gray-400">{phase.fileName}</p>
			<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-full bg-blue-500 transition-all"
					style="width: {phase.totalBytes ? (phase.bytes / phase.totalBytes) * 100 : 100}%"
				></div>
			</div>
		</div>
	{:else if phase?.kind === 'uploading'}
		<div class="space-y-2">
			<p class="text-sm text-gray-900 dark:text-white">
				{phase.transcoding ? 'Transcoding' : 'Uploading'}
				{phase.current} of {phase.total} new {phase.total === 1 ? 'file' : 'files'}
			</p>
			<p class="truncate text-xs text-gray-600 dark:text-gray-400">{phase.fileName}</p>
			<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-full bg-blue-500 transition-all"
					style="width: {((phase.current - 1) / phase.total) * 100}%"
				></div>
			</div>
		</div>
	{:else if phase?.kind === 'done'}
		<p
			class="text-sm {phase.failed
				? 'text-red-700 dark:text-red-400'
				: 'text-gray-900 dark:text-white'}"
		>
			{phase.message}
		</p>
	{/if}

	{#snippet actions()}
		{#if phase?.kind === 'done'}
			<Button onclick={() => (phase = null)}>CLOSE</Button>
		{:else}
			<Button onclick={() => (stopping = true)} variant="outlined" disabled={stopping}>
				{stopping ? 'STOPPING...' : 'STOP'}
			</Button>
		{/if}
	{/snippet}
</Dialog>
