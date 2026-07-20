import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import { camerasService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Camera } from '$lib/api/types';
import CameraIndex from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	camerasService: { getCameras: vi.fn() }
}));

const state = () => {
	const s = new AppState();
	s.loading = false;
	return s;
};

beforeEach(() => {
	vi.mocked(goto).mockReset();
	vi.mocked(camerasService.getCameras).mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('camera index route', () => {
	it('redirects to the first camera', async () => {
		vi.mocked(camerasService.getCameras).mockResolvedValue([
			{ id: 'leica-q2', model: 'Q2' } as Camera
		]);
		renderWithApp(CameraIndex, { state: state() });
		await vi.waitFor(() =>
			expect(goto).toHaveBeenCalledWith('/camera/leica-q2', { replaceState: true })
		);
	});

	it('shows an empty state when there are no cameras', async () => {
		vi.mocked(camerasService.getCameras).mockResolvedValue([]);
		renderWithApp(CameraIndex, { state: state() });
		expect(await screen.findByText('No cameras available')).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});
});
