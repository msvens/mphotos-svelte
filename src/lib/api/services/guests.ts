import type { Guest, AuthUser, GuestReaction, GuestLike, PhotoComment } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface RegisterGuestParams {
	email: string;
	name: string;
	fullName?: string;
	description?: string;
}

export interface UpdateGuestParams {
	name: string;
	fullName?: string;
	description?: string;
}

export interface GuestsService {
	registerGuest(params: RegisterGuestParams): Promise<Guest>;
	verifyGuest(code: string): Promise<Guest>;
	/** Request a 6-digit login code by email. Always resolves with a neutral message. */
	loginGuest(email: string): Promise<{ message: string }>;
	/** Consume the emailed login code and sign in. */
	loginVerifyGuest(email: string, code: string): Promise<Guest>;
	updateGuest(params: UpdateGuestParams): Promise<Guest>;
	getGuest(): Promise<Guest>;
	isGuest(): Promise<boolean>;
	logoutGuest(): Promise<AuthUser>;
	getPhotoLikes(photoId: string): Promise<GuestReaction[]>;
	getGuestLike(photoId: string): Promise<boolean>;
	getGuestLikes(): Promise<string[]>;
	likePhoto(photoId: string): Promise<string>;
	unlikePhoto(photoId: string): Promise<string>;
	getPhotoComments(photoId: string): Promise<PhotoComment[]>;
	commentPhoto(photoId: string, comment: string): Promise<PhotoComment>;
	/** Build the URL that serves a guest's avatar (original, or a 48/192 square variant). */
	getAvatarUrl(guestId: string, size?: 48 | 192): string;
	/** Upload the signed-in guest's avatar (JPEG/PNG). Returns the updated guest. */
	uploadAvatar(file: File): Promise<Guest>;
	/** Remove the signed-in guest's avatar. Returns the updated guest. */
	removeAvatar(): Promise<Guest>;
}

export const guestsService: GuestsService = {
	async registerGuest(params: RegisterGuestParams): Promise<Guest> {
		return api.put<Guest>(API_ENDPOINTS.guest, params);
	},

	async verifyGuest(code: string): Promise<Guest> {
		return api.get<Guest>(API_ENDPOINTS.guestVerify, { params: { code } });
	},

	async loginGuest(email: string): Promise<{ message: string }> {
		return api.put<{ message: string }>(API_ENDPOINTS.guestLogin, { email });
	},

	async loginVerifyGuest(email: string, code: string): Promise<Guest> {
		return api.put<Guest>(API_ENDPOINTS.guestLoginVerify, { email, code });
	},

	async updateGuest(params: UpdateGuestParams): Promise<Guest> {
		return api.put<Guest>(API_ENDPOINTS.guestUpdate, params);
	},

	async getGuest(): Promise<Guest> {
		return api.get<Guest>(API_ENDPOINTS.guest);
	},

	async isGuest(): Promise<boolean> {
		const data = await api.get<AuthUser>(API_ENDPOINTS.guestIs);
		return data.authenticated;
	},

	async logoutGuest(): Promise<AuthUser> {
		return api.get<AuthUser>(API_ENDPOINTS.guestLogout);
	},

	async getPhotoLikes(photoId: string): Promise<GuestReaction[]> {
		return api.get<GuestReaction[]>(API_ENDPOINTS.photoLikes(photoId));
	},

	async getGuestLike(photoId: string): Promise<boolean> {
		const data = await api.get<GuestLike>(API_ENDPOINTS.guestLikePhoto(photoId));
		return data.like;
	},

	async getGuestLikes(): Promise<string[]> {
		return api.get<string[]>(API_ENDPOINTS.guestLikes);
	},

	async likePhoto(photoId: string): Promise<string> {
		return api.put<string>(API_ENDPOINTS.likePhoto(photoId));
	},

	async unlikePhoto(photoId: string): Promise<string> {
		return api.put<string>(API_ENDPOINTS.unlikePhoto(photoId));
	},

	async getPhotoComments(photoId: string): Promise<PhotoComment[]> {
		return api.get<PhotoComment[]>(API_ENDPOINTS.photoComments(photoId));
	},

	async commentPhoto(photoId: string, comment: string): Promise<PhotoComment> {
		return api.post<PhotoComment>(API_ENDPOINTS.photoComments(photoId), { body: comment });
	},

	getAvatarUrl(guestId: string, size?: 48 | 192): string {
		return API_ENDPOINTS.guestAvatar(guestId, size);
	},

	async uploadAvatar(file: File): Promise<Guest> {
		const formData = new FormData();
		formData.append('avatar', file, file.name);
		return api.post<Guest>(API_ENDPOINTS.guestAvatarUpload, formData);
	},

	async removeAvatar(): Promise<Guest> {
		return api.delete<Guest>(API_ENDPOINTS.guestAvatarBase);
	}
};
