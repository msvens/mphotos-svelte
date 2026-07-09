import type { Album, PhotoList, AffectedItems } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface AlbumsService {
	getAlbums(): Promise<Album[]>;
	getAlbum(id: string): Promise<Album>;
	createAlbum(name: string, description: string, coverPic: string): Promise<Album>;
	updateAlbum(album: Album): Promise<Album>;
	deleteAlbum(id: string): Promise<Album>;
	getAlbumPhotos(id: string, code?: string): Promise<PhotoList>;
	addAlbumPhotos(id: string, photoIds: string[]): Promise<AffectedItems>;
	deleteAlbumPhotos(id: string, photoIds: string[]): Promise<AffectedItems>;
	updateAlbumOrder(album: Album, photoList: PhotoList): Promise<Album>;
}

export const albumsService: AlbumsService = {
	async getAlbums() {
		return api.get<Album[]>(API_ENDPOINTS.albums);
	},

	async getAlbum(id: string) {
		return api.get<Album>(API_ENDPOINTS.album(id));
	},

	async createAlbum(name: string, description: string, coverPic: string) {
		return api.post<Album>(API_ENDPOINTS.albums, { name, description, coverPic });
	},

	async updateAlbum(album: Album) {
		return api.put<Album>(API_ENDPOINTS.album(album.id), album);
	},

	async deleteAlbum(id: string) {
		return api.delete<Album>(API_ENDPOINTS.album(id));
	},

	async getAlbumPhotos(id: string, code?: string) {
		const url = code
			? `${API_ENDPOINTS.albumPhotos(id)}?code=${encodeURIComponent(code)}`
			: API_ENDPOINTS.albumPhotos(id);
		return api.get<PhotoList>(url);
	},

	async addAlbumPhotos(id: string, photoIds: string[]) {
		return api.put<AffectedItems>(`${API_ENDPOINTS.albumPhotos(id)}/add`, { photoIds });
	},

	async deleteAlbumPhotos(id: string, photoIds: string[]) {
		return api.put<AffectedItems>(`${API_ENDPOINTS.albumPhotos(id)}/delete`, { photoIds });
	},

	async updateAlbumOrder(album: Album, photoList: PhotoList) {
		if (photoList.length < 2) {
			return Promise.resolve(album);
		}
		const photoIds = photoList.photos.map((p) => p.id);
		return api.put<Album>(`${API_ENDPOINTS.album(album.id)}/order`, { photos: photoIds });
	}
};
