import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { capabilitiesService, jobsService, photosService } from '$lib/api/services';
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
	jobsService: { cancelJob: vi.fn() },
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

/** The dialog's final message, once the pick has been checked (and any upload has finished). */
async function finalMessage() {
	await screen.findByRole('button', { name: 'CLOSE' });
	return screen.getByRole('dialog').querySelector('p')?.textContent?.trim();
}

const allKnown = async (md5s: string[]) => Object.fromEntries(md5s.map((m) => [m, true]));

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
	vi.mocked(jobsService.cancelJob).mockReset();
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

	it('offers a folder picker', async () => {
		const { container } = renderWithApp(LocalDrive);
		const click = vi.spyOn(folderInput(container), 'click');
		await fireEvent.click(screen.getByRole('button', { name: 'CHOOSE FOLDER' }));
		expect(click).toHaveBeenCalled();
	});

	it('uploads the new files straight after picking, in order', async () => {
		const { container } = renderWithApp(LocalDrive);
		const [a, b] = [jpeg('a.jpg'), jpeg('b.jpg')];

		await pickFiles(container, [a, b]);

		expect(await finalMessage()).toBe('Uploaded 2 new photos.');
		expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(1, a);
		expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(2, b);
	});

	it('uploads only the files the server does not have, and counts only those', async () => {
		vi.mocked(photosService.checkLocalPhotos).mockResolvedValue({
			'md5:a.jpg': false,
			'md5:b.jpg': true,
			'md5:c.jpg': false
		});
		const { container } = renderWithApp(LocalDrive);
		const [a, b, c] = [jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')];

		await pickFiles(container, [a, b, c], folderInput(container));

		expect(await finalMessage()).toBe('Uploaded 2 new photos.');
		expect(photosService.checkLocalPhotos).toHaveBeenCalledWith([
			'md5:a.jpg',
			'md5:b.jpg',
			'md5:c.jpg'
		]);
		expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(2);
		expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(1, a);
		expect(photosService.uploadLocalPhoto).toHaveBeenNthCalledWith(2, c);
	});

	it('uploads identical files once', async () => {
		const { container } = renderWithApp(LocalDrive);
		const first = jpeg('a.jpg', 'same');

		await pickFiles(container, [first, jpeg('copy.jpg', 'same')], folderInput(container));

		expect(await finalMessage()).toBe('Uploaded 1 new photo.');
		expect(photosService.checkLocalPhotos).toHaveBeenCalledWith(['md5:same']);
		expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(1);
		expect(photosService.uploadLocalPhoto).toHaveBeenCalledWith(first);
	});

	it('never hashes unsupported files', async () => {
		const { container } = renderWithApp(LocalDrive);
		const notes = new File(['n'], 'notes.txt', { type: 'text/plain' });
		const heic = new File(['h'], 'IMG.heic', { type: 'image/heic' });

		await pickFiles(
			container,
			[jpeg('a.jpg'), notes, heic, jpeg('._a.jpg')],
			folderInput(container)
		);

		expect(await finalMessage()).toBe('Uploaded 1 new photo.');
		expect(md5File).toHaveBeenCalledTimes(1);
	});

	describe('nothing new', () => {
		it('names the files that are already uploaded, with only a close button', async () => {
			vi.mocked(photosService.checkLocalPhotos).mockImplementation(allKnown);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')]);

			expect(await finalMessage()).toBe(
				'Nothing new to upload: a.jpg, b.jpg and c.jpg are already uploaded.'
			);
			expect(screen.queryByRole('button', { name: 'STOP' })).not.toBeInTheDocument();
			expect(photosService.uploadLocalPhoto).not.toHaveBeenCalled();
		});

		it('names a single already-uploaded file', async () => {
			vi.mocked(photosService.checkLocalPhotos).mockImplementation(allKnown);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg')]);
			expect(await finalMessage()).toBe('Nothing new to upload: a.jpg is already uploaded.');
		});

		it('counts instead of naming when there are many', async () => {
			vi.mocked(photosService.checkLocalPhotos).mockImplementation(allKnown);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(
				container,
				['a', 'b', 'c', 'd'].map((n) => jpeg(`${n}.jpg`))
			);
			expect(await finalMessage()).toBe('Nothing new to upload: all 4 files are already uploaded.');
		});

		it('does not ask the server when nothing is supported', async () => {
			const { container } = renderWithApp(LocalDrive);
			const notes = new File(['n'], 'notes.txt', { type: 'text/plain' });

			await pickFiles(container, [notes], folderInput(container));
			expect(await finalMessage()).toBe('None of the chosen files can be uploaded.');
			expect(photosService.checkLocalPhotos).not.toHaveBeenCalled();
		});
	});

	it('reports a failed check and uploads nothing', async () => {
		vi.mocked(photosService.checkLocalPhotos).mockRejectedValue(new Error('boom'));
		const { container, toast } = renderWithApp(LocalDrive);

		await pickFiles(container, [jpeg('a.jpg')]);

		await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('error'));
		expect(toast.toasts[0].message).toBe('Failed to check which files are new');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(photosService.uploadLocalPhoto).not.toHaveBeenCalled();
	});

	it('closes the dialog with CLOSE', async () => {
		const { container } = renderWithApp(LocalDrive);

		await pickFiles(container, [jpeg('a.jpg')]);
		await finalMessage();
		await fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));

		await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	describe('STOP', () => {
		it('while checking: closes without asking the server or uploading', async () => {
			let finishFirst!: (md5: string) => void;
			vi.mocked(md5File).mockImplementationOnce(
				() => new Promise((resolve) => (finishFirst = resolve))
			);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg')]);
			await fireEvent.click(await screen.findByRole('button', { name: 'STOP' }));
			finishFirst('md5:a.jpg');

			await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
			expect(md5File).toHaveBeenCalledTimes(1);
			expect(photosService.checkLocalPhotos).not.toHaveBeenCalled();
		});

		it('while uploading: finishes the current file, then stops', async () => {
			let finishFirst!: (photo: PhotoMetadata) => void;
			vi.mocked(photosService.uploadLocalPhoto).mockImplementationOnce(
				() => new Promise((resolve) => (finishFirst = resolve))
			);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg'), jpeg('c.jpg')]);
			await screen.findByText('Uploading 1 of 3 new files');
			await fireEvent.click(screen.getByRole('button', { name: 'STOP' }));
			expect(screen.getByRole('button', { name: 'STOPPING...' })).toBeDisabled();
			finishFirst({} as PhotoMetadata);

			expect(await finalMessage()).toBe('Stopped. Uploaded 1 of 3 new photos.');
			expect(photosService.uploadLocalPhoto).toHaveBeenCalledTimes(1);
		});
	});

	describe('outcome', () => {
		it('mentions a file that was uploaded elsewhere after the check', async () => {
			vi.mocked(photosService.uploadLocalPhoto)
				.mockRejectedValueOnce(new Error('Photo already exists'))
				.mockResolvedValue({} as PhotoMetadata);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg')]);
			expect(await finalMessage()).toBe('Uploaded 1 of 2 new photos, 1 was already uploaded.');
		});

		it('flags genuine failures', async () => {
			vi.mocked(photosService.uploadLocalPhoto)
				.mockRejectedValueOnce(new Error('boom'))
				.mockResolvedValue({} as PhotoMetadata);
			const { container } = renderWithApp(LocalDrive);

			await pickFiles(container, [jpeg('a.jpg'), jpeg('b.jpg')]);
			expect(await finalMessage()).toBe('Uploaded 1 of 2 new photos, failed 1.');
			expect(screen.getByText('Uploaded 1 of 2 new photos, failed 1.')).toHaveClass('text-red-700');
		});

		it('refreshes the photo list after a successful upload', async () => {
			// Without this, new uploads sit outside the cached list until a full reload — they
			// go missing from the stream, and clicking one from a filtered view opens the wrong photo.
			const { container, state, photos } = renderWithApp(LocalDrive);
			const load = vi.spyOn(photos, 'load').mockResolvedValue(undefined);

			await pickFiles(container, [jpeg('a.jpg')]);
			await finalMessage();
			expect(load).toHaveBeenCalledWith(state.isUser, state.user.photoStreamAlbumId, true);
		});

		it('does not refresh when nothing was uploaded', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockRejectedValue(new Error('boom'));
			const { container, photos } = renderWithApp(LocalDrive);
			const load = vi.spyOn(photos, 'load').mockResolvedValue(undefined);

			await pickFiles(container, [jpeg('a.jpg')]);
			await finalMessage();
			expect(load).not.toHaveBeenCalled();
		});
	});

	it('clears the picker so the same folder can be picked again', async () => {
		const { container } = renderWithApp(LocalDrive);
		const input = folderInput(container);
		const cleared = vi.spyOn(input, 'value', 'set');

		await pickFiles(container, [jpeg('a.jpg')], input);
		expect(cleared).toHaveBeenCalledWith('');
	});

	describe('video', () => {
		beforeEach(() => {
			vi.mocked(capabilitiesService.getCapabilities).mockResolvedValue({ videoEnabled: true });
		});

		async function uploadVideo(file = videoFile('clip.mov')) {
			const rendered = renderWithApp(LocalDrive);
			await screen.findByText('Upload Photos & Videos');
			await pickFiles(rendered.container, [file]);
			return rendered;
		}

		it('only accepts video when the server can transcode it', async () => {
			const { container } = renderWithApp(LocalDrive);
			await screen.findByText('Upload Photos & Videos');

			const accept = filesInput(container).getAttribute('accept');
			expect(accept).toContain('video/mp4');
			expect(accept).toContain('video/quicktime');
		});

		it('waits for the transcode job and counts what it added', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(pollJob).mockResolvedValue(job(JobState.FINISHED, { numAdded: 1 }));
			await uploadVideo();

			expect(await finalMessage()).toBe('Uploaded 1 new video.');
			expect(pollJob).toHaveBeenCalledWith('j1');
		});

		it('names an HDR failure and says how to fix it', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockResolvedValue(job(JobState.SCHEDULED));
			vi.mocked(pollJob).mockResolvedValue(
				job(JobState.FINISHED, {
					numFailed: 1,
					failures: [{ name: 'clip.mov', category: 'hdr' }]
				})
			);
			await uploadVideo();

			expect(await finalMessage()).toBe(`Failed 1: clip.mov (HDR video). ${HDR_HINT}`);
		});

		describe('STOP', () => {
			/** The transcode job runs until cancelled, then reports CANCELLED. */
			function transcodeUntilCancelled() {
				let cancelled = false;
				let end: ((j: Job) => void) | undefined;
				// Like the server: a job cancelled before polling starts still ends CANCELLED.
				vi.mocked(pollJob).mockImplementation(
					(id) =>
						new Promise((resolve) => {
							end = resolve;
							if (cancelled) resolve(job(JobState.CANCELLED, { id }));
						})
				);
				vi.mocked(jobsService.cancelJob).mockImplementation(async (id) => {
					cancelled = true;
					end?.(job(JobState.CANCELLED, { id }));
					return job(JobState.STARTED, { id });
				});
			}

			it('cancels the server job of a video being transcoded', async () => {
				vi.mocked(photosService.uploadLocalPhoto).mockResolvedValue(job(JobState.SCHEDULED));
				transcodeUntilCancelled();
				await uploadVideo();

				await screen.findByText('Transcoding 1 of 1 new file');
				await fireEvent.click(screen.getByRole('button', { name: 'STOP' }));

				expect(jobsService.cancelJob).toHaveBeenCalledWith('j1');
				expect(await finalMessage()).toBe('Stopped. Nothing was uploaded.');
			});

			it('cancels the job as soon as a video that was still uploading returns it', async () => {
				let returnJob!: (j: Job) => void;
				vi.mocked(photosService.uploadLocalPhoto).mockImplementation(
					() => new Promise((resolve) => (returnJob = resolve))
				);
				transcodeUntilCancelled();
				await uploadVideo();

				await screen.findByText('Uploading 1 of 1 new file');
				await fireEvent.click(screen.getByRole('button', { name: 'STOP' }));
				expect(jobsService.cancelJob).not.toHaveBeenCalled();
				returnJob(job(JobState.SCHEDULED));

				expect(await finalMessage()).toBe('Stopped. Nothing was uploaded.');
				expect(jobsService.cancelJob).toHaveBeenCalledWith('j1');
			});

			it('keeps what a cancelled job had already added', async () => {
				vi.mocked(photosService.uploadLocalPhoto)
					.mockResolvedValueOnce({} as PhotoMetadata)
					.mockResolvedValue(job(JobState.SCHEDULED));
				transcodeUntilCancelled();
				const rendered = renderWithApp(LocalDrive);
				await screen.findByText('Upload Photos & Videos');
				await pickFiles(rendered.container, [jpeg('a.jpg'), videoFile('clip.mov')]);

				await screen.findByText('Transcoding 2 of 2 new files');
				await fireEvent.click(screen.getByRole('button', { name: 'STOP' }));

				expect(await finalMessage()).toBe('Stopped. Uploaded 1 of 2 new files.');
			});
		});

		it('reports a file nginx refused as too large', async () => {
			vi.mocked(photosService.uploadLocalPhoto).mockRejectedValue(
				new ApiError(413, 'HTTP error! status: 413')
			);
			await uploadVideo(videoFile('huge.mov'));

			expect(await finalMessage()).toBe('Failed 1: huge.mov (too large).');
		});
	});
});
