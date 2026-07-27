import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { photosService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoMetadata } from '$lib/api/types';
import AlbumCrop from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: {
		params: { id: 'alb1', photoId: 'pa' },
		url: new URL('http://localhost/album/alb1/pa/crop')
	}
}));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	albumsService: { getAlbumPhotos: vi.fn(), getAlbums: vi.fn() },
	photosService: {
		getPhoto: vi.fn(),
		getPhotoUrl: (id: string) => `/api/images/${id}.jpg`,
		getEditPreviewUrl: () => '/preview',
		editPhoto: vi.fn()
	}
}));

const photo: PhotoMetadata = {
	id: 'pa',
	title: 'A',
	fileName: 'pa.jpg',
	width: 4000,
	height: 3000
} as PhotoMetadata;

function state(isUser: boolean): AppState {
	const s = new AppState();
	s.isUser = isUser;
	s.loading = false;
	return s;
}

beforeEach(() => {
	page.params.id = 'alb1';
	page.params.photoId = 'pa';
	page.url.searchParams.delete('code');
	vi.mocked(goto).mockReset();
	vi.mocked(photosService.getPhoto).mockReset().mockResolvedValue(photo);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('album cover-crop route', () => {
	it('redirects a guest back to the album photo view', async () => {
		renderWithApp(AlbumCrop, { state: state(false) });
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/album/alb1/pa'));
	});

	it('preserves the access code in the guest redirect', async () => {
		page.url.searchParams.set('code', 'abc');
		renderWithApp(AlbumCrop, { state: state(false) });
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/album/alb1/pa?code=abc'));
	});

	it('shows not-found for the owner when the photo is missing', async () => {
		vi.mocked(photosService.getPhoto).mockRejectedValue(new Error('nope'));
		renderWithApp(AlbumCrop, { state: state(true) });
		expect(await screen.findByText('Photo not found')).toBeInTheDocument();
	});
});
