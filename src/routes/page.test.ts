import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { photosService, albumsService } from '$lib/api/services';
import { AppState, defaultUXConfig } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoMetadata, PhotoList, UXConfig } from '$lib/api/types';
import Home from './+page.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	photosService: {
		getPhotos: vi.fn(),
		setPhotoAlbums: vi.fn(),
		getPhotoThumbUrl: (id: string) => `/api/thumbs/${id}.jpg`
	},
	albumsService: { getAlbumPhotos: vi.fn(), addAlbumPhotos: vi.fn(), deleteAlbumPhotos: vi.fn() }
}));

const ALBUM = 'stream-album';

function photo(id: string): PhotoMetadata {
	return { id, title: `Title ${id}`, fileName: `${id}.jpg` } as PhotoMetadata;
}

const list = (...ids: string[]): PhotoList => ({ length: ids.length, photos: ids.map(photo) });

function state(isUser: boolean, config: Partial<UXConfig> = {}): AppState {
	const s = new AppState();
	s.uxConfig = { ...defaultUXConfig, photoStreamAlbumId: ALBUM, showBio: false, ...config };
	s.user = { name: 'Martin', bio: '', pic: '' };
	s.isUser = isUser;
	s.loading = false;
	return s;
}

const tiles = () => screen.getAllByRole('link').map((a) => a.getAttribute('href'));

beforeEach(() => {
	vi.mocked(photosService.getPhotos)
		.mockReset()
		.mockResolvedValue(list('a', 'b', 'c'));
	vi.mocked(albumsService.getAlbumPhotos).mockReset().mockResolvedValue(list('a'));
	vi.mocked(albumsService.addAlbumPhotos).mockReset().mockResolvedValue({ numItems: 1 });
	vi.mocked(albumsService.deleteAlbumPhotos).mockReset().mockResolvedValue({ numItems: 1 });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('home page', () => {
	it('shows a loading state until the app state settles', () => {
		const s = new AppState(); // loading defaults true
		renderWithApp(Home, { state: s });
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	describe('as a guest', () => {
		it('shows only the photostream', async () => {
			renderWithApp(Home, { state: state(false) });
			await vi.waitFor(() => expect(tiles()).toEqual(['/photo/a']));
			expect(photosService.getPhotos).not.toHaveBeenCalled();
		});

		it('offers no overlay bar at all', async () => {
			// Guarding inside the snippet would still paint the dark bar over every tile.
			renderWithApp(Home, { state: state(false) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(1));

			expect(screen.queryByRole('button', { name: /photostream/i })).toBeNull();
			expect(document.querySelector('.bg-black\\/50')).toBeNull();
		});

		it('offers no Show Photostream switch', async () => {
			renderWithApp(Home, { state: state(false) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(1));
			expect(screen.queryByLabelText('Show Photostream')).toBeNull();
		});

		it('dims nothing', async () => {
			renderWithApp(Home, { state: state(false) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(1));
			expect(screen.getByAltText('Title a').className).toContain('opacity-100');
		});
	});

	describe('as the owner', () => {
		it('shows every photo by default', async () => {
			// Switch OFF means "show everything" — not inverted, matching both prior apps.
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toEqual(['/photo/a', '/photo/b', '/photo/c']));
		});

		it('loads both lists in exactly one round', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			expect(photosService.getPhotos).toHaveBeenCalledTimes(1);
			expect(albumsService.getAlbumPhotos).toHaveBeenCalledTimes(1);
		});

		it('dims photos that are outside the photostream', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			expect(screen.getByAltText('Title a').className).toContain('opacity-100');
			expect(screen.getByAltText('Title b').className).toContain('opacity-25');
		});

		it('narrows to the photostream without refetching', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));
			vi.mocked(photosService.getPhotos).mockClear();
			vi.mocked(albumsService.getAlbumPhotos).mockClear();

			await fireEvent.click(screen.getByText('Show Photostream'));

			await vi.waitFor(() => expect(tiles()).toEqual(['/photo/a']));
			expect(photosService.getPhotos).not.toHaveBeenCalled();
			expect(albumsService.getAlbumPhotos).not.toHaveBeenCalled();
		});

		it('stops dimming once narrowed to the photostream', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			await fireEvent.click(screen.getByText('Show Photostream'));

			await vi.waitFor(() =>
				expect(screen.getByAltText('Title a').className).toContain('opacity-100')
			);
		});

		it('hides the switch when no photostream album is configured', async () => {
			renderWithApp(Home, { state: state(true, { photoStreamAlbumId: '' }) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));
			expect(screen.queryByLabelText('Show Photostream')).toBeNull();
		});
	});

	describe('photostream toggle', () => {
		it('adds a photo with a targeted call', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			await fireEvent.click(screen.getAllByRole('button', { name: 'Add to photostream' })[0]);

			await vi.waitFor(() =>
				expect(albumsService.addAlbumPhotos).toHaveBeenCalledWith(ALBUM, ['b'])
			);
			expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
		});

		it('removes a photo with a targeted call', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			await fireEvent.click(screen.getByRole('button', { name: 'Remove from photostream' }));

			await vi.waitFor(() =>
				expect(albumsService.deleteAlbumPhotos).toHaveBeenCalledWith(ALBUM, ['a'])
			);
			expect(photosService.setPhotoAlbums).not.toHaveBeenCalled();
		});

		it('flips the icon after a change', async () => {
			renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			await fireEvent.click(screen.getByRole('button', { name: 'Remove from photostream' }));

			await vi.waitFor(() =>
				expect(screen.queryByRole('button', { name: 'Remove from photostream' })).toBeNull()
			);
		});

		it('toasts when the change fails', async () => {
			vi.mocked(albumsService.addAlbumPhotos).mockRejectedValue(new Error('nope'));
			const { toast } = renderWithApp(Home, { state: state(true) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(3));

			await fireEvent.click(screen.getAllByRole('button', { name: 'Add to photostream' })[0]);

			await vi.waitFor(() => expect(toast.toasts).toHaveLength(1));
			expect(toast.toasts[0]).toMatchObject({
				severity: 'error',
				message: 'Failed to update photostream'
			});
		});
	});

	describe('bio', () => {
		it('is shown when configured', async () => {
			renderWithApp(Home, { state: state(false, { showBio: true }) });
			await vi.waitFor(() => expect(screen.getByRole('separator')).toBeInTheDocument());
		});

		it('is hidden when not', async () => {
			renderWithApp(Home, { state: state(false) });
			await vi.waitFor(() => expect(tiles()).toHaveLength(1));
			expect(screen.queryByRole('separator')).toBeNull();
		});
	});
});
