import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { capabilitiesService, photosService } from '$lib/api/services';
import { ApiError } from '$lib/api/client';
import { renderWithApp } from '$lib/test-utils';
import { JobState, type Job, type PhotoMetadata } from '$lib/api/types';
import LocalDrive from './LocalDrive.svelte';
import { HDR_HINT, pollJob } from './jobs';
import { md5File } from './localScan';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn(), uploadLocalPhoto: vi.fn(), checkLocalPhotos: vi.fn() },
	capabilitiesService: { getCapabilities: vi.fn() },
	isJob: (r: object) => 'state' in r
}));

// pollJob has its own tests; here it just hands back the finished job.
vi.mock('./jobs', async (importOriginal) => ({
	...(await importOriginal<typeof import('./jobs')>()),
	pollJob: vi.fn()
}));

// md5File has its own tests (with the real WASM hasher); here a file's "hash" is its content, so
// files built with the same content count as duplicates.
vi.mock('./localScan', async (importOriginal) => ({
	...(await importOriginal<typeof import('./localScan')>()),
	md5File: vi.fn()
}));
const fakeMd5 = async (file: File, onBytes?: (n: number) => void) => {
	onBytes?.(file.size);
	return `md5:${await file.text()}`;
};

// Content defaults to the name, so distinct files hash differently.
const videoFile = (name: string, content = name) =>
	new File([content], name, { type: 'video/quicktime' });

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

const jpeg = (name: string, content = name) => new File([content], name, { type: 'image/jpeg' });

const filesInput = (container: HTMLElement) =>
	container.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
const folderInput = (container: HTMLElement) =>
	container.querySelector('input[webkitdirectory]') as HTMLInputElement;

function pickFiles(container: HTMLElement, files: File[], input = filesInput(container)) {
	return fireEvent.change(input, { target: { files } });
}

/** Confirm the "N new" dialog once the pick has been hashed and checked. */
async function confirmUpload() {
	await fireEvent.click(await screen.findByRole('button', { name: 'UPLOAD' }));
}

beforeEach(() => {
	vi.mocked(photosService.uploadLocalPhoto)
		.mockReset()
		.mockResolvedValue({} as PhotoMetadata);
	vi.mocked(capabilitiesService.getCapabilities)
		.mockReset()
		.mockResolvedValue({ videoEnabled: false });
	vi.mocked(photosService.checkLocalPhotos)
		.mockReset()
		.mockImplementation(async (md5s) => Object.fromEntries(md5s.map((m) => [m, false])));
	vi.mocked(md5File).mockReset().mockImplementation(fakeMd5);
	vi.mocked(pollJob).mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('LocalDrive', () => {
	it('restricts the file picker to supported image formats', () => {
		const { container } = renderWithApp(LocalDrive);
		expect(filesInput(container)).toHaveAttribute(
			'accept',
			'image/jpeg,image/png,image/gif,image/tiff,image/bmp'
		);
	});

	it('uploads each chosen file once, in order', async () => {
		const { container } = renderWithApp(LocalDrive);
		const [a, b] = [jpeg('a.jpg'), jpeg('b.jpg')];

		await pickFiles(container, [a, b]);
		await confirmUpload();

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
		await confirmUpload();

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
		await confirmUpload();

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
		await confirmUpload();

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalled());
		expect(load).toHaveBeenCalledWith(state.isUser, state.user.photoStreamAlbumId, true);
	});

	it('does not refresh when nothing new is uploaded', async () => {
		vi.mocked(photosService.uploadLocalPhoto).mockRejectedValue(new Error('Photo already exists'));
		const { container, photos } = renderWithApp(LocalDrive);
		const load = vi.spyOn(photos, 'load').mockResolvedValue(undefined);

		await pickFiles(container, [jpeg('a.jpg')]);
		await confirmUpload();

		await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalled());
		expect(load).not.toHaveBeenCalled();
	});

	describe('checking before upload', () => {
		it('offers a folder picker', async () => {
			const { container } = renderWithApp(LocalDrive);
			const click = vi.spyOn(folderInput(container), 'click');
			await fireEvent.click(screen.getByRole('button', { name: 'CHOOSE FOLDER' }));
			expect(click).toHaveBeenCalled();
		});

		it('uploads only the files the server does not have', async () => {
			vi.mocked(photosService.checkLocalPhotos).mockResolvedValue({
				'md5:a.jpg': false,
				'md5:b.jpg': true,
				'md5:c.jpg': false
			});
			const { container } = renderWithApp(LocalDrive);
			const [a, b, c] = [jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')];

			await pickFiles(container, [a, b, c], folderInput(container));
			expect(await screen.findByText('2 new of 3 files.')).toBeInTheDocument();
			expect(photosService.checkLocalPhotos).toHaveBeenCalledWith([
				'md5:a.jpg',
				'md5:b.jpg',
				'md5:c.jpg'
			]);
			await confirmUpload();

			await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(2));
			expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(1, a);
			expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(2, c);
		});

		it('uploads identical files once and says so', async () => {
			const { container } = renderWithApp(LocalDrive);
			const first = jpeg('a.jpg', 'same');

			await pickFiles(container, [first, jpeg('copy.jpg', 'same')], folderInput(container));
			expect(
				await screen.findByText('1 duplicate within the selection skipped.')
			).toBeInTheDocument();
			expect(photosService.checkLocalPhotos).toHaveBeenCalledWith(['md5:same']);
			await confirmUpload();

			await vi.waitFor(() => expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(1));
			expect(photosService.uploadLocalPhoto).toHaveBeenCalledWith(first);
		});

		it('skips unsupported files without hashing them', async () => {
			const { container } = renderWithApp(LocalDrive);
			const notes = new File(['n'], 'notes.txt', { type: 'text/plain' });
			const heic = new File(['h'], 'IMG.heic', { type: 'image/heic' });
			const twin = jpeg('._a.jpg');

			await pickFiles(container, [jpeg('a.jpg'), notes, heic, twin], folderInput(container));
			expect(await screen.findByText('3 unsupported files skipped.')).toBeInTheDocument();
			expect(md5File).toHaveBeenCalledTimes(1);
		});

		it('has nothing to upload when everything is already there', async () => {
			vi.mocked(photosService.checkLocalPhotos).mockResolvedValue({ 'md5:a.jpg': true });
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg')], folderInput(container));
			expect(await screen.findByText('There is nothing new to upload.')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'UPLOAD' })).toBeDisabled();
		});

		it('does not ask the server when nothing is supported', async () => {
			const { container } = renderWithApp(LocalDrive);
			const notes = new File(['n'], 'notes.txt', { type: 'text/plain' });

			await pickFiles(container, [notes], folderInput(container));
			expect(await screen.findByText('There is nothing new to upload.')).toBeInTheDocument();
			expect(photosService.checkLocalPhotos).not.toHaveBeenCalled();
		});

		it('reports a failed check and uploads nothing', async () => {
			vi.mocked(photosService.checkLocalPhotos).mockRejectedValue(new Error('boom'));
			const { container, toast } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg')]);

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
			expect(toast.toasts[0].message).toBe('Failed to check which files are new');
			expect(screen.queryByRole('button', { name: 'UPLOAD' })).not.toBeInTheDocument();
		});

		it('uploads nothing when the dialog is cancelled', async () => {
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg')]);
			await screen.findByText('1 new of 1 file.');
			await fireEvent.click(screen.getByRole('button', { name: 'CANCEL' }));

			await vi.waitFor(() =>
				expect(screen.queryByRole('button', { name: 'UPLOAD' })).not.toBeInTheDocument()
			);
			expect(photosService.uploadLocalPhoto).not.toHaveBeenCalled();
		});

		it('stops hashing when cancelled', async () => {
			let finishFirst!: (md5: string) => void;
			vi.mocked(md5File).mockImplementationOnce(
				() => new Promise((resolve) => (finishFirst = resolve))
			);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg')]);
			await fireEvent.click(await screen.findByRole('button', { name: 'CANCEL' }));
			finishFirst('md5:a.jpg');

			await vi.waitFor(() =>
				expect(screen.getByRole('button', { name: 'CHOOSE FILES' })).toBeEnabled()
			);
			expect(md5File).toHaveBeenCalledTimes(1);
			expect(photosService.checkLocalPhotos).not.toHaveBeenCalled();
		});

		it('clears the picker so the same folder can be picked again', async () => {
			const { container } = renderWithApp(LocalDrive);
			const input = folderInput(container);
			const cleared = vi.spyOn(input, 'value', 'set');

			await pickFiles(container, [jpeg('a.jpg')], input);
			expect(cleared).toHaveBeenCalledWith('');
		});
	});

	describe('video', () => {
		beforeEach(() => {
			vi.mocked(capabilitiesService.getCapabilities).mockResolvedValue({ videoEnabled: true });
		});

		async function uploadVideo(file = videoFile('clip.mov')) {
			const rendered = renderWithApp(LocalDrive);
			await screen.findByText('Upload Photos & Videos');
			await pickFiles(rendered.container, [file]);
			await confirmUpload();
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
