import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { camerasService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Camera } from '$lib/api/types';
import CameraDetailRoute from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
	page: { params: { id: 'nikon-z6' }, url: new URL('http://localhost/camera/nikon-z6') }
}));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	camerasService: {
		getCameras: vi.fn(),
		getCameraImageUrl: vi.fn(() => '/img'),
		updateCamera: vi.fn(),
		uploadCameraImage: vi.fn(),
		updateCameraImageUrl: vi.fn()
	}
}));

const cameras = [
	{ id: 'nikon-z6', model: 'Z6', make: 'Nikon', image: 'x' } as Camera,
	{ id: 'leica-q2', model: 'Q2', make: 'Leica', image: 'x' } as Camera
];

function guestState(): AppState {
	const s = new AppState();
	s.loading = false;
	s.isUser = false;
	return s;
}

beforeEach(() => {
	page.params.id = 'nikon-z6';
	vi.mocked(goto).mockReset();
	vi.mocked(camerasService.getCameras).mockReset().mockResolvedValue(cameras);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('camera detail route', () => {
	it('renders the selected camera and a menu of all cameras', async () => {
		renderWithApp(CameraDetailRoute, { state: guestState() });
		expect(await screen.findByAltText('Z6')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Z6' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Q2' })).toBeInTheDocument();
	});

	it('navigates when another camera is selected', async () => {
		renderWithApp(CameraDetailRoute, { state: guestState() });
		await screen.findByAltText('Z6');

		await fireEvent.click(screen.getByRole('button', { name: 'Q2' }));

		expect(goto).toHaveBeenCalledWith('/camera/leica-q2');
	});

	it('shows not-found for an unknown camera id', async () => {
		page.params.id = 'does-not-exist';
		renderWithApp(CameraDetailRoute, { state: guestState() });
		expect(await screen.findByText('Camera not found')).toBeInTheDocument();
	});
});
