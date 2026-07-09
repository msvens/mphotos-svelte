import type { PhotoMetadata, PhotoList, AffectedItems, Album } from '../types';
import { API_ENDPOINTS } from '../config';
import { api } from '../client';

export interface EditPhotoParams {
	rotation: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PhotosService {
	getPhotos(): Promise<PhotoList>;
	getPagedPhotos(limit: number, offset: number): Promise<PhotoList>;
	getPhotosByCameraModel(cameraModel: string): Promise<PhotoList>;
	getPhoto(id: string): Promise<PhotoMetadata>;
	updatePhoto(
		id: string,
		title: string,
		description: string,
		keywords: string
	): Promise<PhotoMetadata>;
	editPhoto(id: string, params: EditPhotoParams): Promise<PhotoMetadata>;
	uploadLocalPhoto(file: File): Promise<PhotoMetadata>;
	deletePhoto(id: string, removeFiles: boolean): Promise<PhotoMetadata>;
	deletePhotos(removeFiles: boolean): Promise<PhotoList>;
	setPhotoAlbums(photoId: string, albumIds: string[]): Promise<AffectedItems>;
	getPhotoAlbums(photoId: string): Promise<Album[]>;
	getLandscapeUrl(id: string): string;
	getPortraitUrl(id: string): string;
	getSquareUrl(id: string): string;
	getPhotoThumbUrl(id: string): string;
	getPhotoResizeUrl(id: string): string;
	getPhotoUrl(id: string): string;
	getPhotoAspect(photo: PhotoMetadata): 'portrait' | 'landscape' | 'square';
	getDynamicImageUrl(photo: PhotoMetadata, isPortrait: boolean, isMobile: boolean): string;
}

export const photosService: PhotosService = {
	async getPhotos() {
		return this.getPagedPhotos(0, 0);
	},

	async getPagedPhotos(limit: number, offset: number) {
		const url = offset
			? `${API_ENDPOINTS.photos}?limit=${limit}&offset=${offset}`
			: `${API_ENDPOINTS.photos}?limit=${limit}`;
		try {
			return await api.get<PhotoList>(url);
		} catch (error) {
			console.error('Error fetching photos:', error);
			return { length: 0, photos: [] };
		}
	},

	async getPhotosByCameraModel(cameraModel: string) {
		const url = `${API_ENDPOINTS.photos}?cameraModel=${encodeURIComponent(cameraModel)}`;
		try {
			return await api.get<PhotoList>(url);
		} catch (error) {
			console.error('Error fetching photos by camera:', error);
			return { length: 0, photos: [] };
		}
	},

	async getPhoto(id: string) {
		return api.get<PhotoMetadata>(API_ENDPOINTS.photo(id));
	},

	async updatePhoto(id: string, title: string, description: string, keywords: string) {
		const data = {
			id,
			title,
			description,
			keywords: keywords
				.split(',')
				.map((k) => k.trim())
				.filter((k) => k.length > 0)
		};
		return api.put<PhotoMetadata>(API_ENDPOINTS.photo(id), data);
	},

	async editPhoto(id: string, params: EditPhotoParams) {
		return api.put<PhotoMetadata>(`${API_ENDPOINTS.photo(id)}/edit`, params);
	},

	async uploadLocalPhoto(file: File) {
		const formData = new FormData();
		formData.append('image', file, file.name);
		formData.append('sourceId', file.name);
		formData.append('sourceDate', new Date(file.lastModified).toISOString());
		return api.post<PhotoMetadata>('/api/local/upload', formData);
	},

	async deletePhoto(id: string, removeFiles: boolean) {
		return api.delete<PhotoMetadata>(API_ENDPOINTS.photo(id), { body: { removeFiles } });
	},

	async deletePhotos(removeFiles: boolean) {
		return api.delete<PhotoList>(API_ENDPOINTS.photos, { body: { removeFiles } });
	},

	async setPhotoAlbums(photoId: string, albumIds: string[]) {
		return api.put<AffectedItems>(`${API_ENDPOINTS.photo(photoId)}/albums/set`, {
			albumIds: albumIds
		});
	},

	async getPhotoAlbums(photoId: string) {
		return api.get<Album[]>(`${API_ENDPOINTS.photo(photoId)}/albums`);
	},

	getLandscapeUrl(id: string) {
		return API_ENDPOINTS.photoLandscape(id);
	},

	getPortraitUrl(id: string) {
		return API_ENDPOINTS.photoPortrait(id);
	},

	getSquareUrl(id: string) {
		return API_ENDPOINTS.photoSquare(id);
	},

	getPhotoThumbUrl(id: string) {
		return API_ENDPOINTS.photoThumb(id);
	},

	getPhotoResizeUrl(id: string) {
		return API_ENDPOINTS.photoResize(id);
	},

	getPhotoUrl(id: string) {
		return API_ENDPOINTS.photoFile(id);
	},

	getPhotoAspect(photo: PhotoMetadata): 'portrait' | 'landscape' | 'square' {
		const ratio = photo.width / photo.height;
		if (ratio >= 1.25) return 'landscape';
		if (ratio >= 0.8) return 'square';
		return 'portrait';
	},

	getDynamicImageUrl(photo: PhotoMetadata, isPortrait: boolean, isMobile: boolean): string {
		// Desktop: use full quality photo
		if (!isMobile) {
			return this.getPhotoUrl(photo.id);
		}

		// Mobile portrait: use portrait or square crop based on photo aspect
		if (isPortrait) {
			const aspect = this.getPhotoAspect(photo);
			return aspect === 'portrait' ? this.getPortraitUrl(photo.id) : this.getSquareUrl(photo.id);
		}

		// Mobile landscape: use landscape crop
		return this.getLandscapeUrl(photo.id);
	}
};
