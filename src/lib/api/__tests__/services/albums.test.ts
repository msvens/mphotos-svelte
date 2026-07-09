import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { albumsService } from '../../../api/services/albums';
import { API_ENDPOINTS } from '../../../api/config';
import { type Album, PhotoOrder } from '../../../api/types';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

const mockAlbum: Album = {
	id: 'a1',
	name: 'Test Album',
	description: 'A test album',
	coverPic: '/api/thumbs/p1.jpg',
	code: '',
	orderBy: PhotoOrder.UploadDate
};

describe('albumsService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.post).mockReset();
		vi.mocked(api.put).mockReset();
		vi.mocked(api.delete).mockReset();
	});

	it('getAlbums fetches all albums', async () => {
		vi.mocked(api.get).mockResolvedValue([mockAlbum]);
		const result = await albumsService.getAlbums();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.albums);
		expect(result).toEqual([mockAlbum]);
	});

	it('getAlbum fetches single album', async () => {
		vi.mocked(api.get).mockResolvedValue(mockAlbum);
		await albumsService.getAlbum('a1');
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.album('a1'));
	});

	it('createAlbum posts album data', async () => {
		vi.mocked(api.post).mockResolvedValue(mockAlbum);
		await albumsService.createAlbum('Test', 'Desc', '/pic.jpg');
		expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.albums, {
			name: 'Test',
			description: 'Desc',
			coverPic: '/pic.jpg'
		});
	});

	it('updateAlbum sends PUT with album', async () => {
		vi.mocked(api.put).mockResolvedValue(mockAlbum);
		await albumsService.updateAlbum(mockAlbum);
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.album('a1'), mockAlbum);
	});

	it('deleteAlbum sends DELETE', async () => {
		vi.mocked(api.delete).mockResolvedValue(mockAlbum);
		await albumsService.deleteAlbum('a1');
		expect(api.delete).toHaveBeenCalledWith(API_ENDPOINTS.album('a1'));
	});

	describe('getAlbumPhotos', () => {
		it('fetches without code', async () => {
			vi.mocked(api.get).mockResolvedValue({ length: 0, photos: [] });
			await albumsService.getAlbumPhotos('a1');
			expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.albumPhotos('a1'));
		});

		it('appends code when provided', async () => {
			vi.mocked(api.get).mockResolvedValue({ length: 0, photos: [] });
			await albumsService.getAlbumPhotos('a1', 'secret');
			expect(api.get).toHaveBeenCalledWith('/api/albums/a1/photos?code=secret');
		});
	});

	it('addAlbumPhotos sends photo IDs', async () => {
		vi.mocked(api.put).mockResolvedValue({ numItems: 2 });
		await albumsService.addAlbumPhotos('a1', ['p1', 'p2']);
		expect(api.put).toHaveBeenCalledWith('/api/albums/a1/photos/add', { photoIds: ['p1', 'p2'] });
	});

	it('deleteAlbumPhotos sends photo IDs', async () => {
		vi.mocked(api.put).mockResolvedValue({ numItems: 1 });
		await albumsService.deleteAlbumPhotos('a1', ['p1']);
		expect(api.put).toHaveBeenCalledWith('/api/albums/a1/photos/delete', { photoIds: ['p1'] });
	});

	describe('updateAlbumOrder', () => {
		it('sends photo order for lists with 2+ photos', async () => {
			vi.mocked(api.put).mockResolvedValue(mockAlbum);
			const photoList = {
				length: 2,
				photos: [{ id: 'p2' }, { id: 'p1' }]
			};
			await albumsService.updateAlbumOrder(mockAlbum, photoList as never);
			expect(api.put).toHaveBeenCalledWith('/api/albums/a1/order', { photos: ['p2', 'p1'] });
		});

		it('skips API call for lists with fewer than 2 photos', async () => {
			const photoList = { length: 1, photos: [{ id: 'p1' }] };
			const result = await albumsService.updateAlbumOrder(mockAlbum, photoList as never);
			expect(api.put).not.toHaveBeenCalled();
			expect(result).toEqual(mockAlbum);
		});
	});
});
