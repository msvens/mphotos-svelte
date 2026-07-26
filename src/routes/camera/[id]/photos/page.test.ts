import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { page } from '$app/state';
import { camerasService, photosService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Camera, PhotoList, PhotoMetadata } from '$lib/api/types';
import CameraPhotosRoute from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { params: { id: 'nikon-z6' }, url: new URL('http://localhost/camera/nikon-z6/photos') }
}));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn() },
	photosService: {
		getPhotos: vi.fn(),
		getPhotosByCameraModel: vi.fn(),
		getPhotoThumbUrl: (id: string) => `/thumb/${id}`
	},
	camerasService: { getCameras: vi.fn() }
}));

const cameras = [{ id: 'nikon-z6', model: 'Z6', make: 'Nikon', image: 'x' } as Camera];

const photo = (id: string, cameraModel: string): PhotoMetadata =>
	({
		id,
		title: id,
		fileName: `${id}.jpg`,
		cameraModel,
		width: 4000,
		height: 3000
	}) as PhotoMetadata;

const listOf = (...photos: PhotoMetadata[]): PhotoList => ({ length: photos.length, photos });

function ownerState(): AppState {
	const s = new AppState();
	s.loading = false;
	s.isUser = true;
	return s;
}

beforeEach(() => {
	page.params.id = 'nikon-z6';
	vi.mocked(camerasService.getCameras).mockReset().mockResolvedValue(cameras);
	vi.mocked(photosService.getPhotosByCameraModel).mockReset().mockResolvedValue(listOf());
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('camera photos route', () => {
	it('shows the photos the server returns for this camera model', async () => {
		// Filtering is server-side, so the response already contains only this model's photos.
		vi.mocked(photosService.getPhotosByCameraModel).mockResolvedValue(listOf(photo('p-z6', 'Z6')));
		const { container } = renderWithApp(CameraPhotosRoute, { state: ownerState() });

		await vi.waitFor(() =>
			expect(container.querySelector('a[href="/photo/p-z6"]')).toBeInTheDocument()
		);
		expect(photosService.getPhotosByCameraModel).toHaveBeenCalledWith('Z6');
		expect(screen.getByRole('heading', { name: 'Z6 Photos' })).toBeInTheDocument();
	});

	it('shows an empty state when the camera has no photos', async () => {
		vi.mocked(photosService.getPhotosByCameraModel).mockResolvedValue(listOf());
		renderWithApp(CameraPhotosRoute, { state: ownerState() });

		expect(await screen.findByText('No photos found for this camera')).toBeInTheDocument();
	});

	it('shows not-found for an unknown camera id', async () => {
		page.params.id = 'does-not-exist';
		renderWithApp(CameraPhotosRoute, { state: ownerState() });

		expect(await screen.findByText('Camera not found')).toBeInTheDocument();
		expect(photosService.getPhotosByCameraModel).not.toHaveBeenCalled();
	});
});
