import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { guestsService } from '../../../api/services/guests';
import { API_ENDPOINTS } from '../../../api/config';

vi.mock('../../../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		upload: vi.fn()
	}
}));

const mockGuest = {
	email: 'guest@test.com',
	name: 'Guest',
	verified: true,
	verifyTime: '2024-01-01'
};

describe('guestsService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.post).mockReset();
		vi.mocked(api.put).mockReset();
	});

	it('registerGuest sends PUT with params', async () => {
		vi.mocked(api.put).mockResolvedValue(mockGuest);
		await guestsService.registerGuest({ name: 'Guest', email: 'guest@test.com' });
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.guest, {
			name: 'Guest',
			email: 'guest@test.com'
		});
	});

	it('verifyGuest passes code as param', async () => {
		vi.mocked(api.get).mockResolvedValue(mockGuest);
		await guestsService.verifyGuest('abc123');
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.guestVerify, { params: { code: 'abc123' } });
	});

	it('updateGuest sends PUT', async () => {
		vi.mocked(api.put).mockResolvedValue(mockGuest);
		await guestsService.updateGuest({ name: 'New Name', email: 'new@test.com' });
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.guestUpdate, {
			name: 'New Name',
			email: 'new@test.com'
		});
	});

	it('getGuest fetches guest data', async () => {
		vi.mocked(api.get).mockResolvedValue(mockGuest);
		const result = await guestsService.getGuest();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.guest);
		expect(result).toEqual(mockGuest);
	});

	it('isGuest returns authenticated status', async () => {
		vi.mocked(api.get).mockResolvedValue({ authenticated: true });
		expect(await guestsService.isGuest()).toBe(true);
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.guestIs);
	});

	it('logoutGuest calls logout endpoint', async () => {
		vi.mocked(api.get).mockResolvedValue({ authenticated: false });
		await guestsService.logoutGuest();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.guestLogout);
	});

	it('getPhotoLikes fetches likes for a photo', async () => {
		vi.mocked(api.get).mockResolvedValue([]);
		await guestsService.getPhotoLikes('p1');
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.photoLikes('p1'));
	});

	it('getGuestLike returns like status', async () => {
		vi.mocked(api.get).mockResolvedValue({ like: true });
		expect(await guestsService.getGuestLike('p1')).toBe(true);
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.guestLikePhoto('p1'));
	});

	it('getGuestLikes fetches liked photo IDs', async () => {
		vi.mocked(api.get).mockResolvedValue(['p1', 'p2']);
		const result = await guestsService.getGuestLikes();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.guestLikes);
		expect(result).toEqual(['p1', 'p2']);
	});

	it('likePhoto sends PUT', async () => {
		vi.mocked(api.put).mockResolvedValue('ok');
		await guestsService.likePhoto('p1');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.likePhoto('p1'));
	});

	it('unlikePhoto sends PUT', async () => {
		vi.mocked(api.put).mockResolvedValue('ok');
		await guestsService.unlikePhoto('p1');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.unlikePhoto('p1'));
	});

	it('getPhotoComments fetches comments', async () => {
		vi.mocked(api.get).mockResolvedValue([]);
		await guestsService.getPhotoComments('p1');
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.photoComments('p1'));
	});

	it('commentPhoto posts comment', async () => {
		vi.mocked(api.post).mockResolvedValue({ id: 'c1', body: 'Nice!' });
		await guestsService.commentPhoto('p1', 'Nice!');
		expect(api.post).toHaveBeenCalledWith(API_ENDPOINTS.photoComments('p1'), { body: 'Nice!' });
	});
});
