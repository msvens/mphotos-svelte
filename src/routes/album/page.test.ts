import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { albumsService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import { PhotoOrder, type Album } from '$lib/api/types';
import AlbumList from './+page.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: {
		getAlbums: vi.fn(),
		createAlbum: vi.fn(),
		updateAlbum: vi.fn(),
		deleteAlbum: vi.fn()
	}
}));

const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

function ownerState(): AppState {
	const s = new AppState();
	s.isUser = true;
	s.loading = false;
	return s;
}

const album = (id: string, over: Partial<Album> = {}): Album => ({
	id,
	name: `Album ${id}`,
	description: `About ${id}`,
	coverPic: '',
	code: '',
	orderBy: PhotoOrder.None,
	...over
});

beforeEach(() => {
	vi.mocked(albumsService.getAlbums).mockReset().mockResolvedValue([]);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('album listing', () => {
	it('renders a card and link per album', async () => {
		vi.mocked(albumsService.getAlbums).mockResolvedValue([album('a1'), album('a2')]);
		renderWithApp(AlbumList);

		await vi.waitFor(() =>
			expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
				'/album/a1',
				'/album/a2'
			])
		);
		expect(screen.getByRole('heading', { name: 'Photo Albums' })).toBeInTheDocument();
	});

	it('carries the code in a private album link', async () => {
		vi.mocked(albumsService.getAlbums).mockResolvedValue([album('a1', { code: 'x1' })]);
		renderWithApp(AlbumList);

		await vi.waitFor(() =>
			expect(screen.getByRole('link')).toHaveAttribute('href', '/album/a1?code=x1')
		);
	});

	it('shows an empty state when there are no albums', async () => {
		renderWithApp(AlbumList);
		expect(await screen.findByText('No albums yet')).toBeInTheDocument();
	});

	describe('as the owner', () => {
		beforeEach(() => {
			vi.mocked(albumsService.createAlbum).mockReset().mockResolvedValue(album('new'));
			vi.mocked(albumsService.deleteAlbum).mockReset().mockResolvedValue(album('a1'));
		});

		it('shows the add card and per-album edit/delete controls', async () => {
			vi.mocked(albumsService.getAlbums).mockResolvedValue([album('a1')]);
			renderWithApp(AlbumList, { state: ownerState() });

			expect(await screen.findByRole('button', { name: 'ADD ALBUM' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Edit album' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Delete album' })).toBeInTheDocument();
		});

		it('creates an album and refetches', async () => {
			vi.mocked(albumsService.getAlbums).mockResolvedValue([]);
			renderWithApp(AlbumList, { state: ownerState() });

			await fireEvent.click(await screen.findByRole('button', { name: 'ADD ALBUM' }));
			await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Trip' } });
			await fireEvent.click(screen.getByRole('button', { name: 'ADD' }));

			await vi.waitFor(() =>
				expect(albumsService.createAlbum).toHaveBeenCalledWith('Trip', '', '')
			);
			// getAlbums: once on mount, once after the create.
			expect(albumsService.getAlbums).toHaveBeenCalledTimes(2);
		});

		it('deletes an album after confirming', async () => {
			vi.mocked(albumsService.getAlbums).mockResolvedValue([album('a1')]);
			renderWithApp(AlbumList, { state: ownerState() });

			await fireEvent.click(await screen.findByRole('button', { name: 'Delete album' }));
			await fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));

			await vi.waitFor(() => expect(albumsService.deleteAlbum).toHaveBeenCalledWith('a1'));
		});

		it('copies a share link (with code for a hidden album)', async () => {
			writeText.mockClear();
			vi.mocked(albumsService.getAlbums).mockResolvedValue([album('a1', { code: 'x1' })]);
			const { toast } = renderWithApp(AlbumList, { state: ownerState() });

			await fireEvent.click(await screen.findByRole('button', { name: 'Copy share link' }));

			await vi.waitFor(() =>
				expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/album/a1?code=x1`)
			);
			expect(toast.toasts[0]).toMatchObject({ severity: 'success', message: 'Link copied' });
		});
	});
});
