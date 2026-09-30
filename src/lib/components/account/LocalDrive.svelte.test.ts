import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { capabilitiesService, photosService } from '$lib/api/services';
import { ApiError } from '$lib/api/client';
import { renderWithApp } from '$lib/test-utils';
import { JobState, type Job, type PhotoMetadata } from '$lib/api/types';
import LocalDrive from './LocalDrive.svelte';
import { HDR_HINT, pollJob } from './jobs';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn(), uploadLocalPhoto: vi.fn() },
	capabilitiesService: { getCapabilities: vi.fn() },
	isJob: (r: object) => 'state' in r
}));

// pollJob has its own tests; here it just hands back the finished job.
vi.mock('./jobs', async (importOriginal) => ({
	...(await importOriginal<typeof import('./jobs')>()),
	pollJob: vi.fn()
}));

const videoFile = (name: string) => new File(['x'], name, { type: 'video/quicktime' });

const job = (state: JobState, over: Partial<Job> = {}): Job => ({
	id: 'j1',
	kind: 'video',
	state,
	percent: 0,
	numFiles: 1,
	numProcessed: 0,
	numAdded: 0,
	numSkipped: 0,
	numFailed: 0,
	...over
});

const jpeg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

function pickFiles(container: HTMLElement, files: File[]) {
	const input = container.querySelector('input[type="file"]') as HTMLInputElement;
	return fireEvent.change(input, { target: { files } });
}

beforeEach(() => {
	vi.mocked(photosService.uploadLocalPhoto)
		.mockReset()
		.mockResolvedValue({} as PhotoMetadata);
	vi.mocked(capabilitiesService.getCapabilities)
		.mockReset()
		.mockResolvedValue({ videoEnabled: false });
	vi.mocked(pollJob).mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('LocalDrive', () => {
	it('restricts the file picker to supported image formats', () => {
		const { container } = renderWithApp(LocalDrive);
		const input = container.querySelector('input[type="file"]');
		expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/gif,image/tiff,image/bmp');
	});

	it('uploads each chosen file once, in order', async () => {
		const { container } = renderWithApp(LocalDrive);
		const [a, b] = [jpeg('a.jpg'), jpeg('b.jpg')];

		await pickFiles(container, [a, b]);
		await fireEvent.click(screen.getByRole('button', { name: 'UPLOAD PHOTOS' }));

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(2));
		expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(1, a);
		expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(2, b);
	});

	it('reports already-uploaded files as skipped, not failed', async () => {
		vi.mocked(photosService.uploadLocalPhoto)
			.mockRejectedValueOnce(new Error('Photo already exists'))
			.mockResolvedValue({} as PhotoMetadata);
		const { container, toast } = renderWithApp(LocalDrive);

		await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg')]);
		await fireEvent.click(screen.getByRole('button', { name: 'UPLOAD PHOTOS' }));

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(2));
		// A duplicate is benign: informational, and named as a skip.
		await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('info'));
		expect(toast.toasts[0].message).toBe('Uploaded 1, skipped 1 already uploaded.');
	});

	it('flags genuine failures as an error', async () => {
		vi.mocked(photosService.uploadLocalPhoto)
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValue({} as PhotoMetadata);
		const { container, toast } = renderWithApp(LocalDrive);

		await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg')]);
		await fireEvent.click(screen.getByRole('button', { name: 'UPLOAD PHOTOS' }));

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(2));
		await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
		expect(toast.toasts[0].message).toBe('Uploaded 1, failed 1.');
	});

	it('refreshes the photo list after a successful upload', async () => {
		// Without this, new uploads sit outside the cached list until a full reload — they
		// go missing from the stream, and clicking one from a filtered view opens the wrong photo.
		const { container, state, photos } = renderWithApp(LocalDrive);
		const load = vi.spyOn(photos, 'load').mockResolvedValue(undefined);

		await pickFiles(container, [jpeg('a.jpg')]);
		await fireEvent.click(screen.getByRole('button', { name: 'UPLOAD PHOTOS' }));

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalled());
		expect(load).toHaveBeenCalledWith(state.isUser, state.user.photoStreamAlbumId, true);
	});

	it('does not refresh when nothing new is uploaded', async () => {
		vi.mocked(photosService.uploadLocalPhoto).mockRejectedValue(new Error('Photo already exists'));
		const { container, photos } = renderWithApp(LocalDrive);
		const load = vi.spyOn(photos, 'load').mockResolvedValue(undefined);

		await pickFiles(container, [jpeg('a.jpg')]);
		await fireEvent.click(screen.getByRole('button', { name: 'UPLOAD PHOTOS' }));

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalled());
		expect(load).not.toHaveBeenCalled();
	});

	it('disables upload until files are chosen', () => {
		renderWithApp(LocalDrive);
		expect(screen.getByRole('button', { name: 'UPLOAD PHOTOS' })).toBeDisabled();
	});

	describe('video', () => {
		beforeEach(() => {
			vi.mocked(capabilitiesService.getCapabilities).mockResolvedValue({ videoEnabled: true });
		});

		async function uploadVideo(file = videoFile('clip.mov')) {
			const rendered = renderWithApp(LocalDrive);
			await screen.findByText('Upload Photos & Videos');
			await pickFiles(rendered.container, [file]);
			await fireEvent.click(screen.getByRole('button', { name: 'UPLOAD FILES' }));
			return rendered;
		}

		it('only accepts video when the server can transcode it', async () => {
			const { container } = renderWithApp(LocalDrive);
			await screen.findByText('Upload Photos & Videos');

			const accept = container.querySelector('input[type="file"]')?.getAttribute('accept');
			expect(accept).toContain('video/mp4');
			expect(accept).toContain('video/quicktime');
		});

		it('waits for the transcode job and counts what it added', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(pollJob).mockResolvedValue(job(JobState.FINISHED, { numAdded: 1 }));
			const { toast } = await uploadVideo();

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('success'));
			expect(pollJob).toHaveBeenCalledWith('j1');
			expect(toast.toasts[0].message).toBe('Uploaded 1 video');
		});

		it('names an HDR failure and says how to fix it', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(pollJob).mockResolvedValue(
				job(JobState.FINISHED, {
					numFailed: 1,
					failures: [{ name: 'clip.mov', category: 'hdr' }]
				})
			);
			const { toast } = await uploadVideo();

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
			expect(toast.toasts[0].message).toBe(`Failed 1: clip.mov (HDR video). ${HDR_HINT}`);
		});

		it('reports a file nginx refused as too large', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockRejectedValue(
				new ApiError(413, 'HTTP error! status: 413')
			);
			const { toast } = await uploadVideo(videoFile('huge.mov'));

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
			expect(toast.toasts[0].message).toBe('Failed 1: huge.mov (too large).');
		});
	});
});
