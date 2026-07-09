import type { Guest, AuthUser, GuestReaction, GuestLike, PhotoComment } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface RegisterGuestParams {
	name: string;
	email: string;
}

export interface UpdateGuestParams {
	name: string;
	email: string;
}

export interface GuestsService {
	registerGuest(params: RegisterGuestParams): Promise<Guest>;
	verifyGuest(code: string): Promise<Guest>;
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
}

export const guestsService: GuestsService = {
	async registerGuest(params: RegisterGuestParams): Promise<Guest> {
		return api.put<Guest>(API_ENDPOINTS.guest, params);
	},

	async verifyGuest(code: string): Promise<Guest> {
		return api.get<Guest>(API_ENDPOINTS.guestVerify, { params: { code } });
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
	}
};
