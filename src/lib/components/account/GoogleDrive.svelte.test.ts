import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { capabilitiesService, driveService, userService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import { JobState, type Job, type User } from '$lib/api/types';
import GoogleDrive from './GoogleDrive.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn(), updateUserGDrive: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn() },
	driveService: {
		isAuthenticated: vi.fn(),
		disconnectDrive: vi.fn(),
		checkDrive: vi.fn(),
		scheduleAddPhotosJob: vi.fn(),
		scheduleAddVideosJob: vi.fn(),
		getJobStatus: vi.fn()
	},
	capabilitiesService: { getCapabilities: vi.fn() }
}));

const job = (state: JobState, over: Partial<Job> = {}): Job => ({
	id: 'j1',
	kind: 'image',
	state,
	percent: 0,
	numFiles: 3,
	numProcessed: 0,
	numAdded: 0,
	numSkipped: 0,
	numFailed: 0,
	...over
});

function ownerState(user: Partial<User> = {}): AppState {
	const s = new AppState();
	s.isUser = true;
	s.loading = false;
	s.user = { name: 'M', bio: '', pic: '', photoStreamAlbumId: '', ...user };
	return s;
}

beforeEach(() => {
	vi.mocked(driveService.isAuthenticated).mockReset().mockResolvedValue(false);
	vi.mocked(driveService.disconnectDrive).mockReset().mockResolvedValue({ authenticated: false });
	vi.mocked(driveService.checkDrive).mockReset().mockResolvedValue({ images: 3, videos: 0 });
	vi.mocked(driveService.scheduleAddPhotosJob).mockReset();
	vi.mocked(driveService.scheduleAddVideosJob).mockReset();
	vi.mocked(capabilitiesService.getCapabilities)
		.mockReset()
		.mockResolvedValue({ videoEnabled: true });
	vi.mocked(driveService.getJobStatus).mockReset();
	vi.mocked(userService.updateUserGDrive)
		.mockReset()
		.mockResolvedValue({} as User);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GoogleDrive', () => {
	it('shows the connected state once auth is checked', async () => {
		vi.mocked(driveService.isAuthenticated).mockResolvedValue(true);
		renderWithApp(GoogleDrive, { state: ownerState() });

		expect(await screen.findByRole('button', { name: 'DISCONNECT' })).toBeInTheDocument();
	});

	it('redirects to the OAuth url on connect', async () => {
		vi.mocked(driveService.isAuthenticated).mockResolvedValue(false);
		const loc = { href: '' };
		Object.defineProperty(window, 'location', { value: loc, writable: true, configurable: true });
		renderWithApp(GoogleDrive, { state: ownerState() });

		await fireEvent.click(await screen.findByRole('button', { name: 'CONNECT' }));

		expect(loc.href).toBe('/api/drive/auth?redir=%2Faccount');
	});

	it('disconnects and flips back to CONNECT', async () => {
		vi.mocked(driveService.isAuthenticated).mockResolvedValue(true);
		renderWithApp(GoogleDrive, { state: ownerState() });

		await fireEvent.click(await screen.findByRole('button', { name: 'DISCONNECT' }));

		expect(driveService.disconnectDrive).toHaveBeenCalled();
		expect(await screen.findByRole('button', { name: 'CONNECT' })).toBeInTheDocument();
	});

	it('sets the drive folder and refreshes auth', async () => {
		vi.mocked(driveService.isAuthenticated).mockResolvedValue(true);
		const state = ownerState({ driveFolderName: 'MyFolder' });
		const refresh = vi.spyOn(state, 'refreshAuth').mockResolvedValue();
		renderWithApp(GoogleDrive, { state });

		await fireEvent.click(await screen.findByRole('button', { name: 'SET FOLDER' }));

		await vi.waitFor(() => expect(userService.updateUserGDrive).toHaveBeenCalledWith('MyFolder'));
		expect(refresh).toHaveBeenCalled();
	});

	describe('import job', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.mocked(driveService.isAuthenticated).mockResolvedValue(true);
		});
		afterEach(() => vi.useRealTimers());

		/** Click IMPORT FROM DRIVE with the given counts; returns once the check has resolved. */
		async function openImport(counts = { images: 3, videos: 0 }) {
			vi.mocked(driveService.checkDrive).mockResolvedValue(counts);
			const rendered = renderWithApp(GoogleDrive, { state: ownerState({ driveFolderId: 'fid' }) });
			await vi.advanceTimersByTimeAsync(0); // flush onMount auth + capabilities
			await fireEvent.click(screen.getByRole('button', { name: 'IMPORT FROM DRIVE' }));
			await vi.advanceTimersByTimeAsync(0); // flush checkDrive
			return rendered;
		}

		it('says there is nothing new, with only a close button', async () => {
			await openImport({ images: 0, videos: 0 });
			expect(screen.getByText('There is nothing new to import.')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'CLOSE' })).toBeEnabled();
			expect(screen.queryByRole('button', { name: 'START' })).not.toBeInTheDocument();
			expect(driveService.scheduleAddPhotosJob).not.toHaveBeenCalled();
		});

		it('closes the dialog when scheduling fails', async () => {
			vi.mocked(driveService.scheduleAddPhotosJob).mockRejectedValue(new Error('boom'));
			const { toast } = await openImport();

			expect(toast.toasts[0]?.message).toBe('Failed to start import');
			expect(screen.queryByRole('button', { name: 'CLOSE' })).not.toBeInTheDocument();
		});

		it('schedules only the image job when there are no videos, and polls until finished', async () => {
			vi.mocked(driveService.scheduleAddPhotosJob).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(driveService.getJobStatus).mockResolvedValue(
				job(JobState.FINISHED, { percent: 100, numProcessed: 3, numAdded: 3 })
			);
			// Spy before the click: the import starts straight away and refreshes when it finishes.
			const rendered = renderWithApp(GoogleDrive, { state: ownerState({ driveFolderId: 'fid' }) });
			const load = vi.spyOn(rendered.photos, 'load').mockResolvedValue(undefined);
			vi.mocked(driveService.checkDrive).mockResolvedValue({ images: 3, videos: 0 });
			await vi.advanceTimersByTimeAsync(0);
			await fireEvent.click(screen.getByRole('button', { name: 'IMPORT FROM DRIVE' }));

			await vi.advanceTimersByTimeAsync(0); // flush schedule
			await vi.advanceTimersByTimeAsync(500); // one poll tick

			expect(driveService.scheduleAddVideosJob).not.toHaveBeenCalled();
			expect(driveService.getJobStatus).toHaveBeenCalledWith('j1');
			// FINISHED stops the import → the button is enabled 'CLOSE', not 'IMPORTING...'.
			expect(screen.getByRole('button', { name: 'CLOSE' })).toBeEnabled();
			expect(screen.getByText('Images added 3, skipped 0, failed 0.')).toBeInTheDocument();
			// New items must reach the cached list without a reload.
			expect(load).toHaveBeenCalledWith(true, '', true);
		});

		it('runs both jobs at once and reports video failures with the HDR hint', async () => {
			vi.mocked(driveService.scheduleAddPhotosJob).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(driveService.scheduleAddVideosJob).mockResolvedValue(
				job(JobState.SCHEDULED, { id: 'v1', kind: 'video', numFiles: 2 })
			);
			vi.mocked(driveService.getJobStatus).mockImplementation(async (id) =>
				id === 'v1'
					? job(JobState.FINISHED, {
							id: 'v1',
							kind: 'video',
							numFiles: 2,
							numProcessed: 2,
							numAdded: 1,
							numFailed: 1,
							failures: [{ name: 'clip.mov', category: 'hdr' }]
						})
					: job(JobState.FINISHED, { percent: 100, numProcessed: 3, numAdded: 3 })
			);
			await openImport({ images: 3, videos: 2 });
			await vi.advanceTimersByTimeAsync(1000); // image (500ms) and video (1s) polls

			expect(driveService.getJobStatus).toHaveBeenCalledWith('j1');
			expect(driveService.getJobStatus).toHaveBeenCalledWith('v1');
			expect(
				screen.getByText('Videos added 1, skipped 0, failed 1: clip.mov (HDR video).')
			).toBeInTheDocument();
			expect(screen.getByText(/Turn off HDR video/)).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'CLOSE' })).toBeEnabled();
		});

		it("shows an aborted job's error message", async () => {
			vi.mocked(driveService.scheduleAddPhotosJob).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(driveService.getJobStatus).mockResolvedValue(
				job(JobState.ABORTED, { error: { code: 500, message: 'disk full' } })
			);
			const { toast } = await openImport();
			await vi.advanceTimersByTimeAsync(500);

			expect(toast.toasts[0]?.message).toBe('Job aborted: disk full');
		});
	});
});
