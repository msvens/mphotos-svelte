<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { driveService, userService } from '$lib/api/services';
	import { getAppState } from '$lib/stores/app.svelte';
	import { getToastState } from '$lib/stores/toast.svelte';
	import { JobState, type Job } from '$lib/api/types';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';

	const app = getAppState();
	const toast = getToastState();

	// The server handles the Google OAuth round trip and returns to `redir` (a relative path).
	const AUTH_URL = '/api/drive/auth?redir=' + encodeURIComponent('/account');

	let authenticated = $state<boolean | null>(null);

	// Re-sync from the store: `refreshAuth` reloads the user after the folder id resolves.
	let folderName = $derived(app.user.driveFolderName ?? '');
	let folderId = $derived(app.user.driveFolderId ?? '');
	let settingFolder = $state(false);

	// Import-job dialog.
	let openDownload = $state(false);
	let numPhotos = $state(0);
	let job = $state<Job | null>(null);
	let isDownloading = $state(false);

	onMount(async () => {
		try {
			authenticated = await driveService.isAuthenticated();
		} catch (e) {
			console.error('Error checking drive auth:', e);
			authenticated = false;
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

	async function handleOpenDownload() {
		try {
			const df = await driveService.checkDrive();
			numPhotos = df.length;
			job = null;
			openDownload = true;
		} catch (e) {
			console.error('Error checking drive:', e);
			toast.error('Failed to check Google Drive');
		}
	}

	async function handleStart() {
		try {
			const scheduled = await driveService.scheduleAddPhotosJob();
			if (scheduled.state === JobState.SCHEDULED || scheduled.state === JobState.STARTED) {
				job = scheduled;
				isDownloading = true;
			} else {
				toast.error('Failed to start import: ' + scheduled.state);
			}
		} catch (e) {
			console.error('Error scheduling drive job:', e);
			toast.error('Failed to start import');
		}
	}

	function closeDownload() {
		openDownload = false;
		job = null;
		isDownloading = false;
	}

	// Poll the job every 500ms while downloading. `job.id` is read untracked so the interval is
	// created once (when downloading begins) rather than re-created on every status update.
	$effect(() => {
		if (!isDownloading) return;
		const id = untrack(() => job?.id);
		if (!id) return;
		const interval = setInterval(async () => {
			try {
				const updated = await driveService.getJobStatus(id);
				job = updated;
				if (updated.state === JobState.FINISHED) {
					isDownloading = false;
				} else if (updated.state === JobState.ABORTED) {
					isDownloading = false;
					toast.warning('Job aborted: ' + (updated.error ?? 'Unknown error'));
				}
			} catch (e) {
				console.error('Error checking job status:', e);
				isDownloading = false;
			}
		}, 500);
		return () => clearInterval(interval);
	});
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
	</div>
</div>

<Dialog
	open={openDownload}
	onClose={() => !isDownloading && closeDownload()}
	title="Import from Google Drive"
>
	{#if job}
		<div class="space-y-2">
			<p class="text-sm text-gray-900 dark:text-white">
				Processing {job.numProcessed} of {job.numFiles} photos
			</p>
			<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div class="h-full bg-blue-500 transition-all" style="width: {job.percent}%"></div>
			</div>
		</div>
	{:else}
		<p class="text-sm text-gray-900 dark:text-white">
			There are currently {numPhotos} photos to download.
		</p>
	{/if}

	{#snippet actions()}
		{#if job}
			<Button onclick={closeDownload} disabled={isDownloading}>
				{isDownloading ? 'DOWNLOADING...' : 'OK'}
			</Button>
		{:else}
			<Button onclick={closeDownload} variant="outlined">CANCEL</Button>
			<Button onclick={handleStart} disabled={numPhotos === 0}>START</Button>
		{/if}
	{/snippet}
</Dialog>
