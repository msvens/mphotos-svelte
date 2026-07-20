import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Camera } from '$lib/api/types';
import CameraDetail from './CameraDetail.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	camerasService: {
		getCameraImageUrl: vi.fn(() => '/api/cameras/nikon-z6/image/512'),
		updateCamera: vi.fn(),
		uploadCameraImage: vi.fn(),
		updateCameraImageUrl: vi.fn()
	}
}));

function makeCamera(over: Partial<Camera> = {}): Camera {
	return {
		id: 'nikon-z6',
		model: 'Z6',
		make: 'Nikon',
		year: 2018,
		effectivePixels: 24000000,
		sensorType: 'CMOS',
		raw: true,
		image: 'x',
		...over
	} as Camera;
}

function state(isUser: boolean): AppState {
	const s = new AppState();
	s.isUser = isUser;
	s.loading = false;
	return s;
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('CameraDetail', () => {
	it('renders the image, Photos link, and spec rows', () => {
		renderWithApp(CameraDetail, {
			state: state(false),
			props: { camera: makeCamera(), onUpdate: vi.fn() }
		});
		expect(screen.getByAltText('Z6')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Photos' })).toHaveAttribute(
			'href',
			'/camera/nikon-z6/photos'
		);
		expect(screen.getByText('Make')).toBeInTheDocument();
		expect(screen.getByText('Nikon')).toBeInTheDocument();
		expect(screen.getByText('24M')).toBeInTheDocument();
	});

	it('hides owner controls for guests', () => {
		renderWithApp(CameraDetail, {
			state: state(false),
			props: { camera: makeCamera(), onUpdate: vi.fn() }
		});
		expect(screen.queryByRole('button', { name: 'Edit Camera Spec' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Edit Camera Image' })).toBeNull();
	});

	it('opens the spec dialog for the owner', async () => {
		renderWithApp(CameraDetail, {
			state: state(true),
			props: { camera: makeCamera(), onUpdate: vi.fn() }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Edit Camera Spec' }));
		expect(await screen.findByRole('heading', { name: 'Update Camera' })).toBeInTheDocument();
	});

	it('opens the image dialog for the owner', async () => {
		renderWithApp(CameraDetail, {
			state: state(true),
			props: { camera: makeCamera(), onUpdate: vi.fn() }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Edit Camera Image' }));
		expect(await screen.findByRole('heading', { name: 'Image URL' })).toBeInTheDocument();
	});
});
