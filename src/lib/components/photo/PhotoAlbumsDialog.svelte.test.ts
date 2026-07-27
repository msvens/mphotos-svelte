import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { photosService, albumsService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import { PhotoOrder, type Album, type PhotoMetadata } from '$lib/api/types';
import PhotoAlbumsDialog from './PhotoAlbumsDialog.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbums: vi.fn() },
	photosService: { getPhotoAlbums: vi.fn(), setPhotoAlbums: vi.fn() }
}));

const album = (id: string, name: string): Album => ({
	id,
	name,
	description: '',
	coverPic: '',
	code: '',
	orderBy: PhotoOrder.None
});

const photo = { id: 'p1', title: 'P', fileName: 'p1.jpg' } as PhotoMetadata;

beforeEach(() => {
	vi.mocked(albumsService.getAlbums)
		.mockReset()
		.mockResolvedValue([album('a1', 'Alpha'), album('a2', 'Beta')]);
	vi.mocked(photosService.getPhotoAlbums).mockReset().mockResolvedValue([]);
	vi.mocked(photosService.setPhotoAlbums).mockReset().mockResolvedValue({ numItems: 1 });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PhotoAlbumsDialog', () => {
	it('saves the picked albums via setPhotoAlbums', async () => {
		renderWithApp(PhotoAlbumsDialog, { props: { open: true, photo, onClose: vi.fn() } });

		await fireEvent.click(await screen.findByRole('combobox', { name: /Albums/ }));
		await fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
		await fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

		await vi.waitFor(() => expect(photosService.setPhotoAlbums).toHaveBeenCalledWith('p1', ['a2']));
	});

	it('closes without a request when nothing changed', async () => {
		const onClose = vi.fn();
		renderWithApp(PhotoAlbumsDialog, { props: { open: true, photo, onClose } });

		await fireEvent.click(await screen.findByRole('button', { name: 'SAVE' }));

		expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledWith();
	});

	it('swallows the empty-slice error when all albums are cleared', async () => {
		vi.mocked(photosService.getPhotoAlbums).mockResolvedValue([album('a1', 'Alpha')]);
		vi.mocked(photosService.setPhotoAlbums).mockRejectedValue(new Error('empty slice passed'));
		const onClose = vi.fn();
		renderWithApp(PhotoAlbumsDialog, { props: { open: true, photo, onClose } });

		// Deselect the only album, then save.
		await fireEvent.click(await screen.findByRole('combobox', { name: /Albums/ }));
		await fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
		await fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));

		await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
	});
});
