import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { photosService } from '../../../api/services/photos';
import { API_ENDPOINTS } from '../../../api/config';
import type { PhotoMetadata } from '../../../api/types';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

const mockPhoto: PhotoMetadata = {
	id: 'p1',
	md5: 'abc',
	source: 'local',
	sourceDate: '2024-01-01',
	uploadDate: '2024-01-01',
	originalDate: '2024-01-01',
	fileName: 'photo.jpg',
	title: 'Test',
	keywords: 'test',
	description: 'A test photo',
	cameraMake: 'Nikon',
	cameraModel: 'Z6',
	lensModel: '24-70mm',
	focalLength: '50mm',
	focalLength35: '50mm',
	iso: 100,
	exposure: '1/250',
	fNumber: 2.8,
	width: 4000,
	height: 3000,
	likes: 0
};

describe('photosService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.post).mockReset();
		vi.mocked(api.put).mockReset();
		vi.mocked(api.delete).mockReset();
	});

	describe('getPhotos', () => {
		it('delegates to getPagedPhotos with limit=0', async () => {
			vi.mocked(api.get).mockResolvedValue({ length: 1, photos: [mockPhoto] });
			const result = await photosService.getPhotos();
			expect(api.get).toHaveBeenCalledWith('/api/photos?limit=0');
			expect(result).toEqual({ length: 1, photos: [mockPhoto] });
		});
	});

	describe('getPagedPhotos', () => {
		it('builds URL with limit only when offset is 0', async () => {
			vi.mocked(api.get).mockResolvedValue({ length: 0, photos: [] });
			await photosService.getPagedPhotos(10, 0);
			expect(api.get).toHaveBeenCalledWith('/api/photos?limit=10');
		});

		it('builds URL with limit and offset', async () => {
			vi.mocked(api.get).mockResolvedValue({ length: 0, photos: [] });
			await photosService.getPagedPhotos(10, 20);
			expect(api.get).toHaveBeenCalledWith('/api/photos?limit=10&offset=20');
		});

		it('returns empty list on error', async () => {
			vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
			const result = await photosService.getPagedPhotos(10, 0);
			expect(result).toEqual({ length: 0, photos: [] });
		});
	});

	describe('getPhotosByCameraModel', () => {
		it('encodes camera model in URL', async () => {
			vi.mocked(api.get).mockResolvedValue({ length: 0, photos: [] });
			await photosService.getPhotosByCameraModel('Nikon Z6 II');
			expect(api.get).toHaveBeenCalledWith('/api/photos?cameraModel=Nikon%20Z6%20II');
		});

		it('returns empty list on error', async () => {
			vi.mocked(api.get).mockRejectedValue(new Error('fail'));
			const result = await photosService.getPhotosByCameraModel('Nikon');
			expect(result).toEqual({ length: 0, photos: [] });
		});
	});

	describe('getPhoto', () => {
		it('fetches single photo by id', async () => {
			vi.mocked(api.get).mockResolvedValue(mockPhoto);
			const result = await photosService.getPhoto('p1');
			expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.photo('p1'));
			expect(result).toEqual(mockPhoto);
		});
	});

	describe('updatePhoto', () => {
		it('splits keywords and sends PUT', async () => {
			vi.mocked(api.put).mockResolvedValue(mockPhoto);
			await photosService.updatePhoto('p1', 'Title', 'Desc', 'tag1, tag2, tag3');
			expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.photo('p1'), {
				id: 'p1',
				title: 'Title',
				description: 'Desc',
				keywords: ['tag1', 'tag2', 'tag3']
			});
		});

		it('filters empty keywords', async () => {
			vi.mocked(api.put).mockResolvedValue(mockPhoto);
			await photosService.updatePhoto('p1', 'Title', 'Desc', 'tag1, , tag2');
			expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.photo('p1'), {
				id: 'p1',
				title: 'Title',
				description: 'Desc',
				keywords: ['tag1', 'tag2']
			});
		});
	});

	describe('editPhoto', () => {
		it('sends edit params to correct endpoint', async () => {
			vi.mocked(api.put).mockResolvedValue(mockPhoto);
			const params = { rotation: 90, x: 0, y: 0, width: 100, height: 100 };
			await photosService.editPhoto('p1', params);
			expect(api.put).toHaveBeenCalledWith('/api/photos/p1/edit', params);
		});
	});

	describe('uploadLocalPhoto', () => {
		it('sends file as FormData', async () => {
			vi.mocked(api.post).mockResolvedValue(mockPhoto);
			const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
			await photosService.uploadLocalPhoto(file);
			expect(api.post).toHaveBeenCalledWith('/api/local/upload', expect.any(FormData));
		});
	});

	describe('deletePhoto', () => {
		it('sends delete with removeFiles flag', async () => {
			vi.mocked(api.delete).mockResolvedValue(mockPhoto);
			await photosService.deletePhoto('p1', true);
			expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.photo('p1'), {
				body: { removeFiles: true }
			});
		});
	});

	describe('deletePhotos', () => {
		it('sends bulk delete', async () => {
			vi.mocked(api.delete).mockResolvedValue({ length: 0, photos: [] });
			await photosService.deletePhotos(false);
			expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.photos, {
				body: { removeFiles: false }
			});
		});
	});

	describe('setPhotoAlbums', () => {
		it('sets album associations', async () => {
			vi.mocked(api.put).mockResolvedValue({ numItems: 2 });
			await photosService.setPhotoAlbums('p1', ['a1', 'a2']);
			expect(api.put).toHaveBeenCalledWith('/api/photos/p1/albums/set', { albumIds: ['a1', 'a2'] });
		});
	});

	describe('getPhotoAlbums', () => {
		it('fetches albums for a photo', async () => {
			vi.mocked(api.get).mockResolvedValue([]);
			await photosService.getPhotoAlbums('p1');
			expect(api.get).toHaveBeenCalledWith('/api/photos/p1/albums');
		});
	});

	describe('URL builders', () => {
		it('returns correct URLs', () => {
			expect(photosService.getPhotoThumbUrl('p1')).toBe('/api/thumbs/p1.jpg');
			expect(photosService.getPhotoResizeUrl('p1')).toBe('/api/resizes/p1.jpg');
			expect(photosService.getPhotoUrl('p1')).toBe('/api/images/p1.jpg');
			expect(photosService.getLandscapeUrl('p1')).toBe('/api/landscapes/p1.jpg');
			expect(photosService.getPortraitUrl('p1')).toBe('/api/portraits/p1.jpg');
			expect(photosService.getSquareUrl('p1')).toBe('/api/squares/p1.jpg');
		});
	});

	describe('getPhotoAspect', () => {
		it('returns landscape for wide photos', () => {
			expect(photosService.getPhotoAspect({ ...mockPhoto, width: 4000, height: 3000 })).toBe(
				'landscape'
			);
		});

		it('returns portrait for tall photos', () => {
			expect(photosService.getPhotoAspect({ ...mockPhoto, width: 3000, height: 4000 })).toBe(
				'portrait'
			);
		});

		it('returns square for near-square photos', () => {
			expect(photosService.getPhotoAspect({ ...mockPhoto, width: 3000, height: 3000 })).toBe(
				'square'
			);
			// ratio 0.9 is between 0.8 and 1.25 → square
			expect(photosService.getPhotoAspect({ ...mockPhoto, width: 900, height: 1000 })).toBe(
				'square'
			);
		});
	});

	describe('getDynamicImageUrl', () => {
		it('returns full photo URL on desktop', () => {
			const url = photosService.getDynamicImageUrl(mockPhoto, false, false);
			expect(url).toBe('/api/images/p1.jpg');
		});

		it('returns landscape URL on mobile landscape', () => {
			const url = photosService.getDynamicImageUrl(mockPhoto, false, true);
			expect(url).toBe('/api/landscapes/p1.jpg');
		});

		it('returns portrait URL for portrait photo on mobile portrait', () => {
			const tallPhoto = { ...mockPhoto, width: 3000, height: 4000 };
			const url = photosService.getDynamicImageUrl(tallPhoto, true, true);
			expect(url).toBe('/api/portraits/p1.jpg');
		});

		it('returns square URL for landscape photo on mobile portrait', () => {
			// mockPhoto is 4000x3000 → landscape aspect → square crop on mobile portrait
			const url = photosService.getDynamicImageUrl(mockPhoto, true, true);
			expect(url).toBe('/api/squares/p1.jpg');
		});
	});
});
