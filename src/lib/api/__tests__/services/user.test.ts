import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { userService } from '../../../api/services/user';
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

const mockUser = {
	name: 'Martin',
	email: 'martin@test.com',
	bio: 'Photographer',
	image: '/pic.jpg'
};
const mockConfig = { columns: 3, spacing: 4, photoPath: '/photos', thumbPath: '/thumbs' };

describe('userService', () => {
	beforeEach(() => {
		vi.mocked(api.get).mockReset();
		vi.mocked(api.put).mockReset();
	});

	it('getUser fetches user profile', async () => {
		vi.mocked(api.get).mockResolvedValue(mockUser);
		const result = await userService.getUser();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.user);
		expect(result).toEqual(mockUser);
	});

	it('getUserConfig fetches UX config', async () => {
		vi.mocked(api.get).mockResolvedValue(mockConfig);
		await userService.getUserConfig();
		expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.userConfig);
	});

	it('updateUserConfig sends PUT with config', async () => {
		vi.mocked(api.put).mockResolvedValue(mockConfig);
		await userService.updateUserConfig(mockConfig as never);
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.userConfig, mockConfig);
	});

	it('updateUser sends name, bio, and pic', async () => {
		vi.mocked(api.put).mockResolvedValue(mockUser);
		await userService.updateUser('Martin', 'Photographer', '/pic.jpg');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.user, {
			name: 'Martin',
			bio: 'Photographer',
			pic: '/pic.jpg'
		});
	});

	it('updateUserPic sends pic', async () => {
		vi.mocked(api.put).mockResolvedValue(mockUser);
		await userService.updateUserPic('/new-pic.jpg');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.userPic, { pic: '/new-pic.jpg' });
	});

	it('updateUserGDrive sends drive folder name', async () => {
		vi.mocked(api.put).mockResolvedValue(mockUser);
		await userService.updateUserGDrive('MyPhotos');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.userGDrive, { driveFolderName: 'MyPhotos' });
	});
});
