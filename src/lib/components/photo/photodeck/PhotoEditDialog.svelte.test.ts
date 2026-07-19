import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { photosService, albumsService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import { PhotoOrder, type Album, type PhotoMetadata } from '$lib/api/types';
import PhotoEditDialog from './PhotoEditDialog.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbums: vi.fn() },
	photosService: { updatePhoto: vi.fn(), setPhotoAlbums: vi.fn(), getPhotoAlbums: vi.fn() }
}));

const albums: Album[] = [
	{ id: 'a1', name: 'Summer', description: '', coverPic: '', code: '', orderBy: PhotoOrder.None },
	{ id: 'a2', name: 'Winter', description: '', coverPic: '', code: '', orderBy: PhotoOrder.None }
];

function makePhoto(over: Partial<PhotoMetadata> = {}): PhotoMetadata {
	return {
		id: 'p1',
		title: 'Sunrise',
		keywords: 'sky,dawn',
		description: 'A nice one',
		fileName: 'p1.jpg',
		...over
	} as PhotoMetadata;
}

const photo = makePhoto();

async function openDialog(props: Record<string, unknown> = {}) {
	const onClose = vi.fn();
	const result = renderWithApp(PhotoEditDialog, {
		props: { open: true, photo, onClose, ...props }
	});
	// Let onMount(getAlbums) + loadAlbums settle.
	await vi.waitFor(() => expect(albumsService.getAlbums).toHaveBeenCalled());
	return { ...result, onClose };
}

const save = () => screen.getByRole('button', { name: /SAVE|SAVING/ });

beforeEach(() => {
	vi.mocked(albumsService.getAlbums).mockReset().mockResolvedValue(albums);
	vi.mocked(photosService.getPhotoAlbums).mockReset().mockResolvedValue([albums[0]]);
	vi.mocked(photosService.updatePhoto)
		.mockReset()
		.mockResolvedValue(makePhoto({ title: 'Edited' }));
	vi.mocked(photosService.setPhotoAlbums).mockReset().mockResolvedValue({ numItems: 1 });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PhotoEditDialog', () => {
	describe('seeding', () => {
		it('fills the fields from the photo, spacing keywords', async () => {
			await openDialog();

			expect(screen.getByLabelText('Title')).toHaveValue('Sunrise');
			expect(screen.getByLabelText('Keywords')).toHaveValue('sky, dawn');
			expect(screen.getByLabelText('Description')).toHaveValue('A nice one');
		});

		it('preselects the photo’s current albums', async () => {
			await openDialog();
			expect(screen.getByRole('combobox', { name: /Albums/ })).toHaveTextContent('Summer');
		});
	});

	describe('saving nothing', () => {
		it('closes without calling any service when unchanged', async () => {
			const { onClose } = await openDialog();

			await fireEvent.click(save());

			expect(photosService.updatePhoto).not.toHaveBeenCalled();
			expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
			expect(onClose).toHaveBeenCalledWith();
		});
	});

	describe('saving metadata', () => {
		it('updates only the photo when just metadata changed', async () => {
			const { onClose } = await openDialog();

			await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Dawn' } });
			await fireEvent.click(save());

			await vi.waitFor(() => expect(photosService.updatePhoto).toHaveBeenCalled());
			expect(photosService.updatePhoto).toHaveBeenCalledWith(
				'p1',
				'Dawn',
				'A nice one',
				'sky, dawn'
			);
			expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
			expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ title: 'Edited' }));
		});

		it('toasts success', async () => {
			const { toast } = await openDialog();
			await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Dawn' } });

			await fireEvent.click(save());

			await vi.waitFor(() => expect(toast.toasts[0]?.severity).toBe('success'));
		});
	});

	describe('saving albums', () => {
		it('sets albums first, then updates metadata when both changed', async () => {
			const order: string[] = [];
			vi.mocked(photosService.setPhotoAlbums).mockImplementation(async () => {
				order.push('albums');
				return { numItems: 1 };
			});
			vi.mocked(photosService.updatePhoto).mockImplementation(async () => {
				order.push('meta');
				return makePhoto();
			});
			await openDialog();

			await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Dawn' } });
			await fireEvent.click(screen.getByRole('combobox', { name: /Albums/ }));
			await fireEvent.click(screen.getByRole('option', { name: 'Winter' }));
			await fireEvent.click(save());

			await vi.waitFor(() => expect(order).toEqual(['albums', 'meta']));
		});

		it('updates only albums when just membership changed', async () => {
			await openDialog();

			await fireEvent.click(screen.getByRole('combobox', { name: /Albums/ }));
			await fireEvent.click(screen.getByRole('option', { name: 'Winter' }));
			await fireEvent.click(save());

			await vi.waitFor(() => expect(photosService.setPhotoAlbums).toHaveBeenCalled());
			expect(photosService.setPhotoAlbums).toHaveBeenCalledWith('p1', ['a1', 'a2']);
			expect(photosService.updatePhoto).not.toHaveBeenCalled();
		});

		it('clears albums cleanly, swallowing the empty-slice rejection', async () => {
			vi.mocked(photosService.setPhotoAlbums).mockRejectedValue(
				new Error("empty slice passed to 'in' query")
			);
			const { toast } = await openDialog();

			// Deselect the only current album (Summer).
			await fireEvent.click(screen.getByRole('combobox', { name: /Albums/ }));
			await fireEvent.click(screen.getByRole('option', { name: 'Summer' }));
			await fireEvent.click(save());

			await vi.waitFor(() => expect(photosService.setPhotoAlbums).toHaveBeenCalledWith('p1', []));
			expect(toast.toasts.some((t) => t.severity === 'error')).toBe(false);
			expect(toast.toasts[0]?.severity).toBe('success');
		});
	});

	describe('failure', () => {
		it('toasts and stays open when the update rejects', async () => {
			vi.mocked(photosService.updatePhoto).mockRejectedValue(new Error('boom'));
			const { onClose, toast } = await openDialog();
			await fireEvent.input(screen.getByLabelText('Title'), { target: { value: 'Dawn' } });

			await fireEvent.click(save());

			await vi.waitFor(() => expect(toast.toasts.some((t) => t.severity === 'error')).toBe(true));
			expect(onClose).not.toHaveBeenCalled();
		});

		it('re-throws a non-empty-slice album error', async () => {
			vi.mocked(photosService.setPhotoAlbums).mockRejectedValue(new Error('server on fire'));
			const { toast } = await openDialog();

			await fireEvent.click(screen.getByRole('combobox', { name: /Albums/ }));
			await fireEvent.click(screen.getByRole('option', { name: 'Winter' }));
			await fireEvent.click(save());

			await vi.waitFor(() => expect(toast.toasts.some((t) => t.severity === 'error')).toBe(true));
			expect(photosService.updatePhoto).not.toHaveBeenCalled();
		});
	});
});
