import type { User, UXConfig } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface UserService {
	getUser(): Promise<User>;

	getUserConfig(): Promise<UXConfig>;

	updateUserConfig(config: UXConfig): Promise<UXConfig>;

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

	async updateUserConfig(config: UXConfig): Promise<UXConfig> {
		return api.put<UXConfig>(API_ENDPOINTS.userConfig, config);
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
