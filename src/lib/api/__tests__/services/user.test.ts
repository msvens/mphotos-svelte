import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api/client';
import { userService } from '../../../api/services/user';
import { API_ENDPOINTS } from '../../../api/config';
import type { UXConfig } from '../../../api/types';

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
	name: 'Test User',
	bio: 'Test bio',
	pic: '/test-pic.jpg'
};
const mockConfig: UXConfig = {
	photoStreamAlbumId: '',
	photoGridCols: 3,
	photoItemsLoad: 30,
	photoGridSpacing: 0,
	showBio: true,
	photoBackgroundColor: '#121212',
	photoBorders: 'none',
	colorTheme: 'dark',
	denseTopBar: false,
	denseBottomBar: false,
	windowFullScreen: false
};

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

	it('updateUserConfig sends PUT with config and resolves the updated user', async () => {
		// The backend stores the config as an opaque blob on the user row and echoes the
		// row back — so this resolves a User, not the config that was sent.
		vi.mocked(api.put).mockResolvedValue(mockUser);
		const result = await userService.updateUserConfig(mockConfig);
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.userConfig, mockConfig);
		expect(result).toEqual(mockUser);
	});

	it('updateUser sends name, bio, and pic', async () => {
		vi.mocked(api.put).mockResolvedValue(mockUser);
		await userService.updateUser('Test User', 'Test bio', '/test-pic.jpg');
		expect(api.put).toHaveBeenCalledWith(API_ENDPOINTS.user, {
			name: 'Test User',
			bio: 'Test bio',
			pic: '/test-pic.jpg'
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
