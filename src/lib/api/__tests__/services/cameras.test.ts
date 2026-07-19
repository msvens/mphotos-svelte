import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { camerasService } from '../../../api/services/cameras';
import { API_ENDPOINTS } from '../../../api/config';
import type { Camera } from '../../../api/types';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

const mockCamera = {
	id: 'nikon-z6',
	model: 'Z6',
	make: 'Nikon',
	year: 2018,
	effectivePixels: 24,
	totalPixels: 25,
	sensorSize: 'Full frame',
	sensorType: 'CMOS',
	image: '/api/cameras/nikon-z6/image'
} as Camera;

describe('camerasService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.post).mockReset();
		vi.mocked(api.put).mockReset();
		vi.mocked(api.delete).mockReset();
	});

	it('getCameras fetches all cameras', async () => {
		vi.mocked(api.get).mockResolvedValue([mockCamera]);
		const result = await camerasService.getCameras();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.cameras);
		expect(result).toEqual([mockCamera]);
	});

	it('getCamera fetches single camera', async () => {
		vi.mocked(api.get).mockResolvedValue(mockCamera);
		await camerasService.getCamera('nikon-z6');
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.camera('nikon-z6'));
	});

	it('createCamera posts camera data', async () => {
		vi.mocked(api.post).mockResolvedValue(mockCamera);
		await camerasService.createCamera({ model: 'Z6', make: 'Nikon' });
		expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.cameras, { model: 'Z6', make: 'Nikon' });
	});

	it('updateCamera sends PUT', async () => {
		vi.mocked(api.put).mockResolvedValue(mockCamera);
		await camerasService.updateCamera('nikon-z6', { year: 2019 });
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.camera('nikon-z6'), { year: 2019 });
	});

	it('deleteCamera sends DELETE', async () => {
		vi.mocked(api.delete).mockResolvedValue(undefined);
		await camerasService.deleteCamera('nikon-z6');
		expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.camera('nikon-z6'));
	});

	it('uploadCameraImage sends FormData', async () => {
		vi.mocked(api.post).mockResolvedValue(mockCamera);
		const file = new File(['img'], 'camera.jpg', { type: 'image/jpeg' });
		await camerasService.uploadCameraImage('nikon-z6', file);
		expect(api.post).toHaveBeenCalledWith(
			API_ENDPOINTS.cameraImageUpload('nikon-z6'),
			expect.any(FormData)
		);
	});

	it('updateCameraImageUrl sends URL', async () => {
		vi.mocked(api.put).mockResolvedValue(mockCamera);
		await camerasService.updateCameraImageUrl('nikon-z6', 'https://example.com/img.jpg');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.cameraImage('nikon-z6'), {
			url: 'https://example.com/img.jpg'
		});
	});

	describe('getCameraImageUrl', () => {
		it('returns fallback for camera without image', () => {
			const cam = { ...mockCamera, image: '' };
			expect(camerasService.getCameraImageUrl(cam)).toBe('/camera-outline.png');
		});

		it('returns original size by default', () => {
			expect(camerasService.getCameraImageUrl(mockCamera)).toBe('/api/cameras/nikon-z6/image');
		});

		it('returns sized URL for specific sizes', () => {
			expect(camerasService.getCameraImageUrl(mockCamera, '48')).toBe(
				'/api/cameras/nikon-z6/image/48'
			);
			expect(camerasService.getCameraImageUrl(mockCamera, '192')).toBe(
				'/api/cameras/nikon-z6/image/192'
			);
			expect(camerasService.getCameraImageUrl(mockCamera, '512')).toBe(
				'/api/cameras/nikon-z6/image/512'
			);
		});
	});
});
