import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { camerasService, guestsService, photosService } from '$lib/api/services';
import { renderWithApp } from '$lib/test-utils';
import type { Camera, PhotoMetadata, PhotoList } from '$lib/api/types';
import CameraDeck from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: {
		params: { id: 'nikon-z6', photoId: 'a' },
		url: new URL('http://localhost/camera/nikon-z6/photos/a')
	}
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
	camerasService: { getCameras: vi.fn() },
	photosService: {
		getPhotos: vi.fn(),
		getPhotosByCameraModel: vi.fn(),
		deletePhoto: vi.fn(),
		updatePhoto: vi.fn(),
		setPhotoAlbums: vi.fn(),
		getPhotoAlbums: vi.fn(),
		getPhotoThumbUrl: (id: string) => `/api/thumbs/${id}.jpg`,
		getDynamicImageUrl: (p: PhotoMetadata) => `/api/images/${p.id}.jpg`
	}
}));

const cameras = [{ id: 'nikon-z6', model: 'Z6', make: 'Nikon', image: 'x' } as Camera];

const photo = (id: string): PhotoMetadata =>
	({ id, title: `Title ${id}`, fileName: `${id}.jpg`, width: 3000, height: 2000 }) as PhotoMetadata;
const listOf = (...ids: string[]): PhotoList => ({ length: ids.length, photos: ids.map(photo) });

beforeEach(() => {
	page.params.id = 'nikon-z6';
	page.params.photoId = 'a';
	vi.mocked(goto).mockReset();
	vi.mocked(guestsService.getPhotoLikes).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getPhotoComments).mockReset().mockResolvedValue([]);
	vi.mocked(guestsService.getGuestLike).mockReset().mockResolvedValue(false);
	vi.mocked(camerasService.getCameras).mockReset().mockResolvedValue(cameras);
	vi.mocked(photosService.getPhotosByCameraModel)
		.mockReset()
		.mockResolvedValue(listOf('a', 'b', 'c'));
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('camera deck', () => {
	it('shows the camera photo named in the url', async () => {
		renderWithApp(CameraDeck);
		expect(await screen.findByAltText('Title a')).toBeInTheDocument();
		expect(photosService.getPhotosByCameraModel).toHaveBeenCalledWith('Z6');
	});

	it('navigates within the camera, keeping the /camera/{id}/photos/ prefix', async () => {
		renderWithApp(CameraDeck);
		await screen.findByAltText('Title a');

		await fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

		expect(goto).toHaveBeenCalledWith('/camera/nikon-z6/photos/b');
	});

	it('shows not-found for an unknown camera id', async () => {
		page.params.id = 'does-not-exist';
		renderWithApp(CameraDeck);

		expect(await screen.findByText('Camera not found')).toBeInTheDocument();
		expect(photosService.getPhotosByCameraModel).not.toHaveBeenCalled();
	});
});
