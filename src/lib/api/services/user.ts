import type { User, UXConfig } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface UserService {
	getUser(): Promise<User>;

	getUserConfig(): Promise<UXConfig>;

	/**
	 * Store the UX config. Returns the updated **User** — the backend persists the
	 * config as an opaque blob on the user row and echoes the row back, not the config.
	 * Callers wanting the new config should use what they sent.
	 */
	updateUserConfig(config: UXConfig): Promise<User>;

	updateUser(name: string, bio: string, pic: string): Promise<User>;

	updateUserPic(pic: string): Promise<User>;

	updateUserGDrive(driveFolderName: string): Promise<User>;
}

export const userService: UserService = {
	async getUser() {
		return api.get<User>(API_ENDPOINTS.user);
	},

	async getUserConfig(): Promise<UXConfig> {
		return api.get<UXConfig>(API_ENDPOINTS.userConfig);
	},

	async updateUserConfig(config: UXConfig): Promise<User> {
		return api.put<User>(API_ENDPOINTS.userConfig, config);
	},

	async updateUser(name: string, bio: string, pic: string) {
		return api.put<User>(API_ENDPOINTS.user, {
			name: name,
			bio: bio,
			pic: pic
		});
	},

	async updateUserGDrive(driveFolderName: string) {
		return api.put<User>(API_ENDPOINTS.userGDrive, {
			driveFolderName: driveFolderName
		});
	},

	async updateUserPic(pic: string) {
		return api.put<User>(API_ENDPOINTS.userPic, { pic: pic });
	}
};
