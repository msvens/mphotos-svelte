import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { albumsService, guestsService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoMetadata, PhotoList } from '$lib/api/types';
import AlbumDeck from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { params: { id: 'alb1', photoId: 'a' }, url: new URL('http://localhost/album/alb1/a') }
}));

// PhotoDeck mounts PhotoLikes/PhotoComments/PhotoEditDialog, so their services must resolve.
vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn(), updateUserPic: vi.fn() },
	guestsService: {
		getGuestLike: vi.fn(),
		getPhotoLikes: vi.fn(),
		getPhotoComments: vi.fn(),
		likePhoto: vi.fn(),
		unlikePhoto: vi.fn(),
		commentPhoto: vi.fn(),
		isGuest: vi.fn(),
		getGuest: vi.fn()
	},
	albumsService: {
		getAlbumPhotos: vi.fn(),
		addAlbumPhotos: vi.fn(),
		deleteAlbumPhotos: vi.fn(),
		getAlbums: vi.fn()
	},
	photosService: {
		getPhotos: vi.fn(),
		deletePhoto: vi.fn(),
		updatePhoto: vi.fn(),
		setPhotoAlbums: vi.fn(),
		getPhotoAlbums: vi.fn(),
		getPhotoThumbUrl: (id: string) => `/api/thumbs/${id}.jpg`,
		getDynamicImageUrl: (p: PhotoMetadata) => `/api/images/${p.id}.jpg`
	}
}));

const photo = (id: string): PhotoMetadata =>
	({ id, title: `Title ${id}`, fileName: `${id}.jpg`, width: 3000, height: 2000 }) as PhotoMetadata;
const listOf = (...ids: string[]): PhotoList => ({ length: ids.length, photos: ids.map(photo) });

beforeEach(() => {
	page.params.id = 'alb1';
	page.params.photoId = 'a';
	page.url.searchParams.delete('code');
	vi.mocked(goto).mockReset();
	vi.mocked(guestsService.getPhotoLikes).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getPhotoComments).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getGuestLike).mockReset().mockResolvedValue(false);
	vi.mocked(albumsService.getAlbums).mockReset().mockResolvedValue([]);
	vi.mocked(albumsService.getAlbumPhotos)
		.mockReset()
		.mockResolvedValue(listOf('a', 'b', 'c'));
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('album deck', () => {
	it('shows the album photo named in the url', async () => {
		renderWithApp(AlbumDeck);
		expect(await screen.findByAltText('Title a')).toBeInTheDocument();
	});

	it('navigates within the album, keeping the /album/{id}/ prefix', async () => {
		renderWithApp(AlbumDeck);
		await screen.findByAltText('Title a');

		await fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

		expect(goto).toHaveBeenCalledWith('/album/alb1/b');
	});
});
