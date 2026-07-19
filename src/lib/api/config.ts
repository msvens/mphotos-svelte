// When using Nginx as a reverse proxy, we can use relative URLs
export const API_BASE_URL = '';

export const API_ENDPOINTS = {
	// Auth endpoints
	login: '/api/login',
	logout: '/api/logout',
	loggedIn: '/api/loggedin',
	authMethod: '/api/auth/method',
	loginGoogle: '/api/login/google',

	// User and config
	user: '/api/user',
	userConfig: '/api/user/config',
	userPic: '/api/user/pic',
	userGDrive: '/api/user/gdrive',

	// Photos
	photos: '/api/photos',
	photo: (id: string) => `/api/photos/${id}`,
	photoEditPreview: (id: string) => `/api/photos/${id}/edit/preview`,
	photoMetadata: (id: string) => `/api/photos/${id}`,
	photoFile: (id: string) => `/api/images/${id}.jpg`,
	photoThumb: (id: string) => `/api/thumbs/${id}.jpg`,
	photoLandscape: (id: string) => `/api/landscapes/${id}.jpg`,
	photoPortrait: (id: string) => `/api/portraits/${id}.jpg`,
	photoSquare: (id: string) => `/api/squares/${id}.jpg`,
	photoResize: (id: string) => `/api/resizes/${id}.jpg`,

	// Albums
	albums: '/api/albums',
	album: (id: string) => `/api/albums/${id}`,
	albumPhotos: (id: string) => `/api/albums/${id}/photos`,
	addAlbumPhotos: (id: string) => `/api/albums/${id}/photos/add`,
	deleteAlbumPhotos: (id: string) => `/api/albums/${id}/photos/delete`,

	// Comments
	comments: '/api/comments',
	photoComments: (photoId: string) => `/api/comments/${photoId}`,

	// Guests
	guest: '/api/guest',
	guestVerify: '/api/guest/verify',
	guestUpdate: '/api/guest/update',
	guestIs: '/api/guest/is',
	guestLogout: '/api/guest/logout',
	guestLikes: '/api/guest/likes',
	guestLikePhoto: (photoId: string) => `/api/guest/likes/${photoId}`,
	photoLikes: (photoId: string) => `/api/likes/${photoId}`,
	likePhoto: (photoId: string) => `/api/likes/${photoId}/like`,
	unlikePhoto: (photoId: string) => `/api/likes/${photoId}/unlike`,

	// Drive
	driveCheck: '/api/drive/check',

	// Camera endpoints
	cameras: '/api/cameras',
	camera: (name: string) => `/api/cameras/${name}`,
	cameraImage: (name: string) => `/api/cameras/${name}/image`

	// User endpoints
	//users: '/api/users',
	//userImage: (name: string) => `/api/users/${name}/image`,
	//currentUser: '/api/users/current',
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;

export interface RequestConfig extends Omit<RequestInit, 'body'> {
	params?: Record<string, string>;
	body?: unknown;
}

export function createApiUrl(endpoint: string, config?: RequestConfig): string {
	const url = new URL(endpoint, window.location.origin);

	if (config?.params) {
		Object.entries(config.params).forEach(([key, value]) => {
			url.searchParams.append(key, value);
		});
	}

	return url.toString();
}
