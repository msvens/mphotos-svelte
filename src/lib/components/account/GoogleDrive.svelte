<script lang="ts">
	import { onMount } from 'svelte';
	import { capabilitiesService, driveService, userService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getPhotoState } from '$lib/stores/photos.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import { JobState, type DriveCheck, type Job } from '$lib/api/types';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { failureSummary, hasHdrFailure, HDR_HINT, pollJob } from './jobs';

	const app = getAppState();
	const photoState = getPhotoState();
	const toast = getToastState();

	// The server handles the Google OAuth round trip and returns to `redir` (a relative path).
	const AUTH_URL = '/api/drive/auth?redir=' + encodeURIComponent('/account');

	let authenticated = $state<boolean | null>(null);
	let videoEnabled = $state(false);

	// Re-sync from the store: `refreshAuth` reloads the user after the folder id resolves.
	let folderName = $derived(app.user.driveFolderName ?? '');
	let folderId = $derived(app.user.driveFolderId ?? '');
	let settingFolder = $state(false);

	// Import-job dialog. Images and videos sync as two jobs on separate server workers.
	let openDownload = $state(false);
	let counts = $state<DriveCheck>({ images: 0, videos: 0 });
	let imageJob = $state<Job | null>(null);
	let videoJob = $state<Job | null>(null);
	let isDownloading = $state(false);
	let started = $derived(imageJob !== null || videoJob !== null);

	onMount(async () => {
		try {
			authenticated = await driveService.isAuthenticated();
		} catch (e) {
			console.error('Error checking drive auth:', e);
			authenticated = false;
		}
	});

	onMount(async () => {
		try {
			videoEnabled = (await capabilitiesService.getCapabilities()).videoEnabled;
		} catch (e) {
			console.error('Error fetching capabilities:', e);
		}
	});

	async function handleAuthToggle() {
		if (authenticated) {
			try {
				await driveService.disconnectDrive();
				authenticated = false;
				toast.success('Disconnected from Google Drive');
			} catch (e) {
				console.error('Error disconnecting drive:', e);
				toast.error('Failed to disconnect');
			}
		} else {
			// Full-page redirect into the Google OAuth flow; the server returns us to /account.
			window.location.href = AUTH_URL;
		}
	}

	async function handleSetFolder() {
		settingFolder = true;
		try {
			await userService.updateUserGDrive(folderName);
			await app.refreshAuth();
			toast.success('Drive folder updated');
		} catch (e) {
			console.error('Error setting drive folder:', e);
			toast.error('Failed to set drive folder');
		} finally {
			settingFolder = false;
		}
	}

	// The button is the go-ahead: start right away when there is something new, else just say so.
	async function handleOpenDownload() {
		try {
			counts = await driveService.checkDrive();
		} catch (e) {
			console.error('Error checking drive:', e);
			toast.error('Failed to check Google Drive');
			return;
		}
		imageJob = videoJob = null;
		openDownload = true;
		if (counts.images + counts.videos > 0) await handleStart();
	}

	async function handleStart() {
		isDownloading = true;
		let scheduled: [Job | null, Job | null];
		try {
			// Only schedule what has work: an empty video job would just be noise in the dialog.
			scheduled = await Promise.all([
				counts.images > 0 ? driveService.scheduleAddPhotosJob() : null,
				counts.videos > 0 ? driveService.scheduleAddVideosJob() : null
			]);
		} catch (e) {
			console.error('Error scheduling drive job:', e);
			toast.error('Failed to start import');
			isDownloading = false;
			openDownload = false;
			return;
		}
		[imageJob, videoJob] = scheduled;

		try {
			const [images, videos] = await Promise.all([
				scheduled[0] && pollJob(scheduled[0].id, (j) => (imageJob = j), 500),
				scheduled[1] && pollJob(scheduled[1].id, (j) => (videoJob = j))
			]);
			for (const j of [images, videos]) {
				if (j?.state === JobState.ABORTED) {
					toast.warning('Job aborted: ' + (j.error?.message ?? 'Unknown error'));
				}
			}
			// The cached photo list predates the import; refresh so new items show up.
			if ((images?.numAdded ?? 0) + (videos?.numAdded ?? 0) > 0) {
				await photoState.load(app.isUser, app.user.photoStreamAlbumId, true);
			}
		} catch (e) {
			console.error('Error checking job status:', e);
			toast.error('Lost track of the import job');
		} finally {
			isDownloading = false;
		}
	}

	function closeDownload() {
		openDownload = false;
		imageJob = videoJob = null;
		isDownloading = false;
	}

	/** `"added 3, skipped 1, failed 1: a.mov (HDR video)"` for a finished job. */
	function outcome(j: Job): string {
		const parts = [`added ${j.numAdded}`, `skipped ${j.numSkipped}`, `failed ${j.numFailed}`];
		const failures = j.failures ?? [];
		return parts.join(', ') + (failures.length > 0 ? `: ${failureSummary(failures)}` : '');
	}

	let showHdrHint = $derived(hasHdrFailure(videoJob?.failures ?? []));
</script>

<div class="max-w-xl space-y-6">
	<div class="space-y-3">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Google Drive</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Connected: <strong
				>{authenticated === null ? 'checking…' : authenticated ? 'yes' : 'no'}</strong
			>
		</p>
		<Button onclick={handleAuthToggle} variant="outlined" disabled={authenticated === null}>
			{authenticated ? 'DISCONNECT' : 'CONNECT'}
		</Button>
	</div>

	<div class="space-y-3">
		<TextField
			label="Drive folder name"
			bind:value={folderName}
			fullWidth
			disabled={!authenticated}
		/>
		{#if folderId}
			<p class="text-xs text-gray-600 dark:text-gray-400">Folder id: {folderId}</p>
		{/if}
		<Button onclick={handleSetFolder} disabled={!authenticated || settingFolder || !folderName}>
			{settingFolder ? 'SAVING...' : 'SET FOLDER'}
		</Button>
	</div>

	<div class="space-y-3">
		<Button onclick={handleOpenDownload} disabled={!authenticated || !folderId}>
			IMPORT FROM DRIVE
		</Button>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			{videoEnabled
				? 'Photos and videos in the folder are imported. Videos are transcoded on the server, which can take a few minutes each.'
				: 'Photos in the folder are imported; videos are skipped (video support is not enabled on the server).'}
		</p>
	</div>
</div>

<Dialog
	open={openDownload}
	onClose={() => !isDownloading && closeDownload()}
	title="Import from Google Drive"
>
	{#if started}
		<div class="space-y-4">
			{#if imageJob}
				<div class="space-y-2">
					<p class="text-sm text-gray-900 dark:text-white">
						Images: processing {imageJob.numProcessed} of {imageJob.numFiles}
					</p>
					<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
						<div class="h-full bg-blue-500 transition-all" style="width: {imageJob.percent}%"></div>
					</div>
					{#if imageJob.state === JobState.FINISHED}
						<p class="text-sm text-gray-600 dark:text-gray-400">Images {outcome(imageJob)}.</p>
					{/if}
				</div>
			{/if}
			{#if videoJob}
				<!-- No bar: progress only moves when a whole file finishes transcoding. -->
				<div class="space-y-2">
					<p class="text-sm text-gray-900 dark:text-white">
						{videoJob.state === JobState.FINISHED || videoJob.state === JobState.ABORTED
							? `Videos: processed ${videoJob.numProcessed} of ${videoJob.numFiles}`
							: `Videos: transcoding ${Math.min(videoJob.numProcessed + 1, videoJob.numFiles)} of ${videoJob.numFiles}…`}
					</p>
					{#if videoJob.state === JobState.FINISHED}
						<p class="text-sm text-gray-600 dark:text-gray-400">Videos {outcome(videoJob)}.</p>
					{/if}
					{#if showHdrHint}
						<p class="text-sm text-amber-700 dark:text-amber-400">{HDR_HINT}</p>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-gray-900 dark:text-white">
			{counts.images + counts.videos === 0
				? 'There is nothing new to import.'
				: 'Starting the import…'}
		</p>
	{/if}

	{#snippet actions()}
		<Button onclick={closeDownload} disabled={isDownloading}>
			{isDownloading ? 'IMPORTING...' : 'CLOSE'}
		</Button>
	{/snippet}
</Dialog>
