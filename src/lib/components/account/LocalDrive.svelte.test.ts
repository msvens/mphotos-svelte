import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { photosService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoMetadata } from '$lib/api/types';
import LocalDrive from './LocalDrive.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: { getPhotos: vi.fn(), uploadLocalPhoto: vi.fn() }
}));

const jpeg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

function pickFiles(container: HTMLElement, files: File[]) {
	const input = container.querySelector('input[type="file"]') as HTMLInputElement;
	return fireEvent.change(input, { target: { files } });
}

beforeEach(() => {
	vi.mocked(photosService.uploadLocalPhoto)
		.mockReset()
		.mockResolvedValue({} as PhotoMetadata);
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
});
