import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/svelte';
import { camerasService } from '$lib/api/services';
import { AppState } from '$lib/stores/app.svelte';
import { renderWithApp } from '$lib/test-utils';
import type { Camera } from '$lib/api/types';
import CameraImageDialog from './CameraImageDialog.svelte';

vi.mock('$lib/api/services', () => ({
	authService: { isLoggedIn: vi.fn() },
	userService: { getUser: vi.fn(), getUserConfig: vi.fn() },
	guestsService: { isGuest: vi.fn(), getGuest: vi.fn() },
	camerasService: { uploadCameraImage: vi.fn(), updateCameraImageUrl: vi.fn() }
}));

const camera = { id: 'nikon-z6', model: 'Z6', make: 'Nikon', image: '' } as Camera;

function ownerState(): AppState {
	const s = new AppState();
	s.isUser = true;
	s.loading = false;
	return s;
}

function open() {
	const onClose = vi.fn();
	const onUpdate = vi.fn();
	const result = renderWithApp(CameraImageDialog, {
		state: ownerState(),
		props: { camera, open: true, onClose, onUpdate }
	});
	return { ...result, onClose, onUpdate };
}

beforeEach(() => {
	vi.mocked(camerasService.uploadCameraImage).mockReset().mockResolvedValue(camera);
	vi.mocked(camerasService.updateCameraImageUrl).mockReset().mockResolvedValue(camera);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('CameraImageDialog', () => {
	it('submits a URL via updateCameraImageUrl', async () => {
		const { onUpdate } = open();

		await fireEvent.input(screen.getByLabelText('Url'), {
			target: { value: 'https://example.com/x.jpg' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		await vi.waitFor(() =>
			expect(camerasService.updateCameraImageUrl).toHaveBeenCalledWith(
				'nikon-z6',
				'https://example.com/x.jpg'
			)
		);
		expect(camerasService.uploadCameraImage).not.toHaveBeenCalled();
		expect(onUpdate).toHaveBeenCalled();
	});

	it('submits a chosen file via uploadCameraImage', async () => {
		const { container, onUpdate } = open();
		const file = new File(['img'], 'cam.jpg', { type: 'image/jpeg' });
		const input = container.querySelector('input[type="file"]') as HTMLInputElement;

		await fireEvent.change(input, { target: { files: [file] } });
		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		await vi.waitFor(() =>
			expect(camerasService.uploadCameraImage).toHaveBeenCalledWith('nikon-z6', file)
		);
		expect(camerasService.updateCameraImageUrl).not.toHaveBeenCalled();
		expect(onUpdate).toHaveBeenCalled();
	});

	it('validates that a URL or file is provided', async () => {
		const { toast } = open();

		await fireEvent.click(screen.getByRole('button', { name: 'OK' }));

		await vi.waitFor(() => expect(toast.toasts.some((t) => t.severity === 'error')).toBe(true));
		expect(camerasService.uploadCameraImage).not.toHaveBeenCalled();
		expect(camerasService.updateCameraImageUrl).not.toHaveBeenCalled();
	});
});
