import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { driveService, userService } from '$lib/api/services';
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
		getJobStatus: vi.fn()
	}
}));

const job = (state: JobState, over: Partial<Job> = {}): Job => ({
	id: 'j1',
	state,
	percent: 0,
	numFiles: 3,
	numProcessed: 0,
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
	vi.mocked(driveService.checkDrive).mockReset().mockResolvedValue({ length: 3, files: [] });
	vi.mocked(driveService.scheduleAddPhotosJob).mockReset();
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
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it('schedules a job and polls until finished', async () => {
			vi.mocked(driveService.isAuthenticated).mockResolvedValue(true);
			vi.mocked(driveService.scheduleAddPhotosJob).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(driveService.getJobStatus).mockResolvedValue(
				job(JobState.FINISHED, { percent: 100, numProcessed: 3 })
			);
			renderWithApp(GoogleDrive, { state: ownerState({ driveFolderId: 'fid' }) });
			await vi.advanceTimersByTimeAsync(0); // flush onMount auth check

			await fireEvent.click(screen.getByRole('button', { name: 'IMPORT FROM DRIVE' }));
			await vi.advanceTimersByTimeAsync(0); // flush checkDrive
			await fireEvent.click(screen.getByRole('button', { name: 'START' }));
			await vi.advanceTimersByTimeAsync(0); // flush schedule → interval created

			await vi.advanceTimersByTimeAsync(500); // one poll tick

			expect(driveService.getJobStatus).toHaveBeenCalledWith('j1');
			// FINISHED stops the download → the button is enabled 'OK', not 'DOWNLOADING...'.
			expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
		});
	});
});
