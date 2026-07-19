import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { photosService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { PhotoMetadata } from '$lib/api/types';
import CropRoute from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { params: { id: 'p1' }, url: new URL('http://localhost/photo/p1/crop') }
}));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	photosService: {
		getPhoto: vi.fn(),
		editPhoto: vi.fn(),
		getPhotoUrl: (id: string) => `/api/images/${id}.jpg`,
		getEditPreviewUrl: vi.fn(() => 'http://localhost/preview')
	}
}));

const photo = {
	id: 'p1',
	title: 'Sunrise',
	fileName: 'p1.jpg',
	width: 4000,
	height: 3000
} as PhotoMetadata;

function ownerState(isUser = true): AppState {
	const s = new AppState();
	s.isUser = isUser;
	s.loading = false;
	return s;
}

beforeEach(() => {
	vi.mocked(goto).mockReset();
	vi.mocked(photosService.getPhoto).mockReset().mockResolvedValue(photo);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('crop route', () => {
	it('shows a loading state before the photo arrives', () => {
		vi.mocked(photosService.getPhoto).mockReturnValue(new Promise(() => {}));
		renderWithApp(CropRoute, { state: ownerState() });
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('renders the crop editor for the owner', async () => {
		renderWithApp(CropRoute, { state: ownerState() });
		expect(await screen.findByAltText('Sunrise')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});

	it('shows not-found when the fetch fails', async () => {
		vi.mocked(photosService.getPhoto).mockRejectedValue(new Error('nope'));
		renderWithApp(CropRoute, { state: ownerState() });
		expect(await screen.findByText('Photo not found')).toBeInTheDocument();
	});

	it('redirects a guest back to the photo', async () => {
		renderWithApp(CropRoute, { state: ownerState(false) });
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/photo/p1'));
	});
});
