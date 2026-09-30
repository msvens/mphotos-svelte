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

/** Open the dialog and the album list. */
async function openList(onClose = vi.fn()) {
	const rendered = renderWithApp(PhotoAlbumsDialog, { props: { open: true, photo, onClose } });
	const combo = await screen.findByRole('combobox', { name: /Albums/ });
	await fireEvent.click(combo);
	return { ...rendered, combo, onClose };
}

describe('PhotoAlbumsDialog', () => {
	it('saves each pick immediately, without a save button', async () => {
		await openList();

		await fireEvent.click(screen.getByRole('option', { name: 'Beta' }));

		await vi.waitFor(() => expect(photosService.setPhotoAlbums).toHaveBeenCalledWith('p1', ['a2']));
		expect(screen.queryByRole('button', { name: 'SAVE' })).toBeNull();
		expect(await screen.findByText('Saved')).toBeInTheDocument();
	});

	it('saves successive picks in order, so the last write is the last selection', async () => {
		await openList();

		await fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
		await fireEvent.click(screen.getByRole('option', { name: 'Beta' }));

		await vi.waitFor(() => expect(photosService.setPhotoAlbums).toHaveBeenCalledTimes(2));
		expect(vi.mocked(photosService.setPhotoAlbums).mock.calls).toEqual([
			['p1', ['a1']],
			['p1', ['a1', 'a2']]
		]);
	});

	// The bug: picks were lost when the dialog was dismissed the natural way.
	it('keeps the picks when closed from the backdrop', async () => {
		const { onClose } = await openList();

		await fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

		await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
		expect(photosService.setPhotoAlbums).toHaveBeenCalledWith('p1', ['a2']);
	});

	it('closes only the album list on Escape, not the dialog', async () => {
		const { combo, onClose } = await openList();

		await fireEvent.keyDown(combo, { key: 'Escape' });

		expect(combo).toHaveAttribute('aria-expanded', 'false');
		expect(onClose).not.toHaveBeenCalled();
	});

	it('reports no change when closed untouched', async () => {
		const onClose = vi.fn();
		renderWithApp(PhotoAlbumsDialog, { props: { open: true, photo, onClose } });

		await fireEvent.click(await screen.findByRole('button', { name: 'DONE' }));

		expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(onClose).toHaveBeenCalledWith(false));
	});

	it('swallows the empty-slice error when all albums are cleared', async () => {
		vi.mocked(photosService.getPhotoAlbums).mockResolvedValue([album('a1', 'Alpha')]);
		vi.mocked(photosService.setPhotoAlbums).mockRejectedValue(new Error('empty slice passed'));
		const { toast } = await openList();

		// Deselect the only album.
		await fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));

		await vi.waitFor(() => expect(photosService.setPhotoAlbums).toHaveBeenCalledWith('p1', []));
		expect(await screen.findByText('Saved')).toBeInTheDocument();
		expect(toast.toasts.some((t) => t.severity === 'error')).toBe(false);
	});

	it('toasts and shows the server state when a save fails', async () => {
		vi.mocked(photosService.setPhotoAlbums).mockRejectedValue(new Error('server on fire'));
		const { combo, toast } = await openList();

		await fireEvent.click(screen.getByRole('option', { name: 'Beta' }));

		await vi.waitFor(() => expect(toast.toasts.some((t) => t.severity === 'error')).toBe(true));
		// Reloaded from the server, which still has no albums for the photo.
		await vi.waitFor(() => expect(combo).toHaveTextContent('Select albums...'));
	});
});
