import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { page } from '$app/state';
import { albumsService } from '$lib/api/services';
import { ApiError } from '$lib/api/client';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import { PhotoOrder, type Album, type PhotoMetadata, type PhotoList } from '$lib/api/types';
import AlbumDetail from './+page.svelte';

vi.mock('$app/state', () => ({
	page: { params: { id: 'alb1' }, url: new URL('http://localhost/album/alb1') }
}));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: {
		getAlbum: vi.fn(),
		getAlbumPhotos: vi.fn(),
		updateAlbum: vi.fn(),
		updateAlbumOrder: vi.fn()
	},
	photosService: {
		getPhotoThumbUrl: (id: string) => `/thumb/${id}`,
		getLandscapeUrl: (id: string) => `/api/landscapes/${id}.jpg`
	}
}));

function ownerState(): AppState {
	const s = new AppState();
	s.isUser = true;
	s.loading = false;
	return s;
}

const album = (over: Partial<Album> = {}): Album => ({
	id: 'alb1',
	name: 'Trip',
	description: '',
	coverPic: '',
	code: '',
	orderBy: PhotoOrder.None,
	...over
});

const photo = (id: string): PhotoMetadata =>
	({ id, title: `Title ${id}`, fileName: `${id}.jpg` }) as PhotoMetadata;
const listOf = (...ids: string[]): PhotoList => ({ length: ids.length, photos: ids.map(photo) });

beforeEach(() => {
	page.params.id = 'alb1';
	page.url.searchParams.delete('code');
	vi.mocked(albumsService.getAlbum).mockReset().mockResolvedValue(album());
	vi.mocked(albumsService.getAlbumPhotos).mockReset().mockResolvedValue(listOf());
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('album detail', () => {
	it('shows the album name and its photos', async () => {
		vi.mocked(albumsService.getAlbumPhotos).mockResolvedValue(listOf('p1', 'p2'));
		renderWithApp(AlbumDetail);

		expect(await screen.findByRole('heading', { name: 'Trip' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Title p1' })).toHaveAttribute(
			'href',
			'/album/alb1/p1'
		);
	});

	it('carries the access code from the url into the photo links', async () => {
		page.url.searchParams.set('code', 'abc');
		vi.mocked(albumsService.getAlbumPhotos).mockResolvedValue(listOf('p1'));
		renderWithApp(AlbumDetail);

		await vi.waitFor(() =>
			expect(screen.getByRole('link', { name: 'Title p1' })).toHaveAttribute(
				'href',
				'/album/alb1/p1?code=abc'
			)
		);
		expect(albumsService.getAlbumPhotos).toHaveBeenCalledWith('alb1', 'abc');
	});

	it('shows a not-found state when the album is missing', async () => {
		vi.mocked(albumsService.getAlbum).mockRejectedValue(new ApiError(404, 'not found'));
		renderWithApp(AlbumDetail);

		expect(await screen.findByText('Album not found')).toBeInTheDocument();
	});

	it('shows a private state when the photos are code-gated', async () => {
		vi.mocked(albumsService.getAlbumPhotos).mockRejectedValue(
			new ApiError(401, 'Album code did not match')
		);
		renderWithApp(AlbumDetail);

		expect(await screen.findByText('This album is private')).toBeInTheDocument();
		// The name still shows — the album metadata loads fine for guests.
		expect(screen.getByRole('heading', { name: 'Trip' })).toBeInTheDocument();
	});

	it('shows an empty state for an album with no photos', async () => {
		renderWithApp(AlbumDetail);
		expect(await screen.findByText('Add photos to this album')).toBeInTheDocument();
	});

	it('handles the backend omitting photos for an empty album', async () => {
		// An empty album returns `{ length: 0 }` with no `photos` field (Go omitempty).
		vi.mocked(albumsService.getAlbumPhotos).mockResolvedValue({ length: 0 } as never);
		renderWithApp(AlbumDetail);
		expect(await screen.findByText('Add photos to this album')).toBeInTheDocument();
	});

	describe('as the owner', () => {
		beforeEach(() => {
			vi.mocked(albumsService.updateAlbum)
				.mockReset()
				.mockImplementation(async (a) => a);
			vi.mocked(albumsService.updateAlbumOrder)
				.mockReset()
				.mockImplementation(async (a) => a);
			vi.mocked(albumsService.getAlbumPhotos).mockResolvedValue(listOf('p1', 'p2', 'p3'));
		});

		it('reorders photos and saves the new order', async () => {
			renderWithApp(AlbumDetail, { state: ownerState() });

			const save = await screen.findByRole('button', { name: 'Save Ordering' });
			expect(save).toBeDisabled();

			await fireEvent.click(screen.getAllByRole('button', { name: 'Move right' })[0]);
			expect(save).toBeEnabled();

			await fireEvent.click(save);

			await vi.waitFor(() => expect(albumsService.updateAlbumOrder).toHaveBeenCalled());
			const [, listArg] = vi.mocked(albumsService.updateAlbumOrder).mock.calls[0];
			expect(listArg.photos.map((p) => p.id)).toEqual(['p2', 'p1', 'p3']);
		});

		it('sets a photo as the album cover', async () => {
			renderWithApp(AlbumDetail, { state: ownerState() });

			await screen.findAllByRole('button', { name: 'Set as album cover' });
			await fireEvent.click(screen.getAllByRole('button', { name: 'Set as album cover' })[0]);

			await vi.waitFor(() =>
				expect(albumsService.updateAlbum).toHaveBeenCalledWith(
					expect.objectContaining({ coverPic: '/api/landscapes/p1.jpg' })
				)
			);
		});
	});
});
